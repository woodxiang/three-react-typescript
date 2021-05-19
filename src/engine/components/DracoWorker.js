/* WEB WORKER */

var DracoWorker = function () {
  let decoderConfig, decoderPending;
  let dracoGeometry, dracoHeader, baseArray;

  onmessage = function (e) {
    var message = e.data;

    switch (message.type) {
      case "init":
        decoderConfig = message.decoderConfig;
        decoderPending = new Promise(function (resolve /*, reject*/) {
          decoderConfig.onModuleLoaded = function (draco) {
            // Module is Promise-like. Wrap before resolving to avoid loop.
            resolve({ draco: draco });
          };

          DracoDecoderModule(decoderConfig); // eslint-disable-line no-undef
        });
        break;
      case "decode":
        decoderPending.then((module) => {
          var draco = module.draco;
          var decoder = new draco.Decoder();

          try {
            let geometry = Decode(draco, decoder, message.buffer, message.name);

            self.postMessage({ type: "decode", name: message.name, geometry });
          } catch (error) {
            console.error(error);

            self.postMessage({
              type: "error",
              name: message.name,
              error: error.message,
            });
          } finally {
            draco.destroy(decoder);
          }
        });
        break;
    }
  };

  function Decode(draco, decoder, buffer, name) {
    let geometry = null;
    switch (name) {
      case "no_split":
        geometry = DecodeAll(draco, decoder, buffer, name);
        break;
      case "base":
        DecodeGeometry(draco, decoder, buffer, name);
        break;
      default:
        geometry = DecodePointAttributes(draco, decoder, buffer, name);
        break;
    }
    return geometry;
  }

  function DecodeAll(draco, decoder, buffer, name) {
    let startDecode = performance.now();
    let bufferArray = new Int8Array(buffer);

    let dracoHeaderLocal = new draco.DracoHeader();
    let lastStatus = decoder.DecodeArrayToDracoHeader(
      bufferArray,
      bufferArray.length,
      dracoHeaderLocal
    );

    if (!lastStatus.ok() || dracoHeaderLocal.ptr === 0) {
      throw new Error(
        "Worker: Decoding header failed: " + lastStatus.error_msg()
      );
    }

    let dracoGeometryLocal;
    switch (dracoHeaderLocal.GetEncoderType()) {
      case draco.TRIANGULAR_MESH:
        dracoGeometryLocal = new draco.Mesh();
        lastStatus = decoder.DecodeArrayToMesh(bufferArray, bufferArray.length, dracoGeometryLocal);
        break;
      case draco.POINT_CLOUD:
        dracoGeometryLocal = new draco.PointCloud();
        lastStatus = decoder.DecodeArrayToPointCloud(
          baseArray,
          baseArray.byteLength,
          dracoGeometryLocal
        );
        break;
      default:
        throw new Error("Worker: Unexpected geometry type.");
    }

    if (!lastStatus.ok() || dracoGeometryLocal.ptr === 0) {
      throw new Error(
        "Worker: Decoding geometry failed: " + lastStatus.error_msg()
      );
    }
    // console.log("decode geometry duration", performance.now() - startDecode);

    var geometry = { index: null, attributes: [] };

    // Gather all vertex attributes.
    const attributeIDs = {
      position: "POSITION",
      normal: "NORMAL",
      color: "COLOR",
      uv: "TEX_COORD",
      generic: "GENERIC",
    };
    const attributeTypes = {
      position: "Float32Array",
      normal: "Float32Array",
      color: "Float32Array",
      uv: "Float32Array",
      generic: "Float32Array",
    };
    const useUniqueIDs = false;
    for (var attributeName in attributeIDs) {
      var attributeType = self[attributeTypes[attributeName]];

      var attribute;
      var attributeID;

      // A Draco file may be created with default vertex attributes, whose attribute IDs
      // are mapped 1:1 from their semantic name (POSITION, NORMAL, ...). Alternatively,
      // a Draco file may contain a custom set of attributes, identified by known unique
      // IDs. glTF files always do the latter, and `.drc` files typically do the former.
      if (useUniqueIDs) {
        attributeID = attributeIDs[attributeName];
        attribute = decoder.GetAttributeByUniqueId(dracoGeometryLocal, attributeID);
      } else {
        attributeID = decoder.GetAttributeId(
          dracoGeometryLocal,
          draco[attributeIDs[attributeName]]
        );

        if (attributeID === -1) continue;

        attribute = decoder.GetAttribute(dracoGeometryLocal, attributeID);
      }

      geometry.attributes.push(
        decodeAttribute(
          draco,
          decoder,
          dracoGeometryLocal,
          attributeName,
          attributeType,
          attribute
        )
      );
    }

    // Add index.
    if (dracoHeaderLocal.GetEncoderType() === draco.TRIANGULAR_MESH) {
      geometry.index = decodeIndex(draco, decoder, dracoGeometryLocal);
    }

    draco.destroy(dracoGeometryLocal);
    draco.destroy(dracoHeaderLocal);

    // console.log("decode duration", performance.now() - startDecode);

    return geometry;
  }

  /* DecodeGeometry */
  function DecodeGeometry(draco, decoder, buffer, name) {
    if (dracoGeometry || dracoHeader) {
      throw new Error("Worker: Mesh info already exists.");
    }

    let startDecode = performance.now();
    let bufferArray = new Int8Array(buffer);
    baseArray = bufferArray;

    dracoHeader = new draco.DracoHeader();
    let lastStatus = decoder.DecodeArrayToDracoHeader(
      bufferArray,
      bufferArray.length,
      dracoHeader
    );

    if (!lastStatus.ok() || dracoHeader.ptr === 0) {
      throw new Error(
        "Worker: Decoding header failed: " + lastStatus.error_msg()
      );
    }

    switch (dracoHeader.GetEncoderType()) {
      case draco.TRIANGULAR_MESH:
        dracoGeometry = new draco.Mesh();
        lastStatus = decoder.DecodeArrayAttrToMesh(
          bufferArray,
          bufferArray.length,
          dracoHeader,
          name,
          dracoGeometry
        );
        break;
      case draco.POINT_CLOUD:
        dracoGeometry = new draco.PointCloud();
        lastStatus = decoder.DecodeArrayToPointCloud(
          baseArray,
          baseArray.byteLength,
          dracoGeometry
        );
        break;
      default:
        throw new Error("Worker: Unexpected geometry type.");
        break;
    }

    if (!lastStatus.ok() || dracoGeometry.ptr === 0) {
      throw new Error(
        "Worker: Decoding geometry failed: " + lastStatus.error_msg()
      );
    }

    // console.log("decode geometry duration", performance.now() - startDecode);
  }

  /* DecodePointAttributes */
  function DecodePointAttributes(draco, decoder, buffer, name) {
    if (!dracoGeometry || !dracoHeader) {
      throw new Error("Worker: Mesh info not exists.");
    }

    let startDecode = performance.now();
    let bufferArray = new Int8Array(buffer);

    switch (dracoHeader.GetEncoderType()) {
      case draco.TRIANGULAR_MESH:
        lastStatus = decoder.DecodeArrayAttrToMesh(
          bufferArray,
          bufferArray.length,
          dracoHeader,
          name,
          dracoGeometry
        );
        break;
      case draco.POINT_CLOUD:
        break;
      default:
        throw new Error("Worker: Unexpected geometry type.");
    }

    if (!lastStatus.ok() || dracoGeometry.ptr === 0) {
      throw new Error(`Worker: Decoding ${name} failed: ${lastStatus.error_msg()}`);
    }

    // console.log("decode attribute duration", performance.now() - startDecode);
    const attributeName = name,
      attributeType = Float32Array;
    let attributeID = decoder.GetAttributeIdByName(
      dracoGeometry,
      attributeName
    );
    if (attributeID === -1)
      throw new Error("THREE.DRACOLoader: Unexpected attribute ID.");

    let attribute = decoder.GetAttribute(dracoGeometry, attributeID);
    let geometry = {
      index: null,
      attribute: decodeAttribute(
        draco,
        decoder,
        dracoGeometry,
        attributeName,
        attributeType,
        attribute
      ),
    };

    // Add index.
    if (name == "position" && dracoHeader.GetEncoderType() === draco.TRIANGULAR_MESH) {
      geometry.index = decodeIndex(draco, decoder, dracoGeometry);
    }

    //draco.destroy(dracoGeometry);
    return geometry;
  }

  function decodeIndex(draco, decoder, dracoGeometry) {
    var numFaces = dracoGeometry.num_faces();
    var numIndices = numFaces * 3;
    var byteLength = numIndices * 4;

    var ptr = draco._malloc(byteLength);
    decoder.GetTrianglesUInt32Array(dracoGeometry, byteLength, ptr);
    var index = new Uint32Array(draco.HEAPF32.buffer, ptr, numIndices).slice();
    draco._free(ptr);

    return { array: index, itemSize: 1 };
  }

  function decodeAttribute(
    draco,
    decoder,
    dracoGeometry,
    attributeName,
    attributeType,
    attribute
  ) {
    var numComponents = attribute.num_components();
    var numPoints = dracoGeometry.num_points();
    var numValues = numPoints * numComponents;
    var byteLength = numValues * attributeType.BYTES_PER_ELEMENT;
    var dataType = getDracoDataType(draco, attributeType);

    var ptr = draco._malloc(byteLength);
    decoder.GetAttributeDataArrayForAllPoints(
      dracoGeometry,
      attribute,
      dataType,
      byteLength,
      ptr
    );
    var array = new attributeType(draco.HEAPF32.buffer, ptr, numValues).slice();
    draco._free(ptr);

    return {
      name: attributeName,
      array: array,
      itemSize: numComponents,
    };
  }

  function getDracoDataType(draco, attributeType) {
    switch (attributeType) {
      case Float32Array:
        return draco.DT_FLOAT32;
      case Int8Array:
        return draco.DT_INT8;
      case Int16Array:
        return draco.DT_INT16;
      case Int32Array:
        return draco.DT_INT32;
      case Uint8Array:
        return draco.DT_UINT8;
      case Uint16Array:
        return draco.DT_UINT16;
      case Uint32Array:
        return draco.DT_UINT32;
    }
  }
};

export { DracoWorker };
