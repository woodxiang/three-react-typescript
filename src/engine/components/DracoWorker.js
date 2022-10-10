/* WEB WORKER */

const DracoWorker = function () {
  let decoderConfig;
  let decoderPending;
  let dracoGeometry;
  let dracoHeader;
  let baseArray;

  onmessage = function (e) {
    const message = e.data;

    switch (message.type) {
      case 'init':
        decoderConfig = message.decoderConfig;
        decoderPending = new Promise(function (resolve /* , reject */) {
          decoderConfig.onModuleLoaded = function (draco) {
            // Module is Promise-like. Wrap before resolving to avoid loop.
            resolve({ draco });
          };

          DracoDecoderModule(decoderConfig); // eslint-disable-line no-undef
        });
        break;
      case 'decode':
        decoderPending.then((module) => {
          const { draco } = module;
          const decoder = new draco.Decoder();

          try {
            const geometry = Decode(draco, decoder, message.buffer, message.name);

            self.postMessage({ type: 'decode', name: message.name, geometry });
          } catch (error) {
            console.error(error);

            self.postMessage({
              type: 'error',
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
      case 'no_split':
        geometry = DecodeAll(draco, decoder, buffer, name);
        break;
      case 'base':
        DecodeGeometry(draco, decoder, buffer, name);
        break;
      default:
        geometry = DecodePointAttributes(draco, decoder, buffer, name);
        break;
    }
    return geometry;
  }

  function DecodeAll(draco, decoder, buffer, name) {
    const startDecode = performance.now();
    const bufferArray = new Int8Array(buffer);

    const dracoHeaderLocal = new draco.DracoHeader();
    let lastStatus = decoder.DecodeArrayToDracoHeader(bufferArray, bufferArray.length, dracoHeaderLocal);

    if (!lastStatus.ok() || dracoHeaderLocal.ptr === 0) {
      throw new Error(`Worker: Decoding header failed: ${lastStatus.error_msg()}`);
    }

    let dracoGeometryLocal;
    switch (dracoHeaderLocal.GetEncoderType()) {
      case draco.TRIANGULAR_MESH:
        dracoGeometryLocal = new draco.Mesh();
        lastStatus = decoder.DecodeArrayToMesh(bufferArray, bufferArray.length, dracoGeometryLocal);
        break;
      case draco.POINT_CLOUD:
        dracoGeometryLocal = new draco.PointCloud();
        lastStatus = decoder.DecodeArrayToPointCloud(baseArray, baseArray.byteLength, dracoGeometryLocal);
        break;
      default:
        throw new Error('Worker: Unexpected geometry type.');
    }

    if (!lastStatus.ok() || dracoGeometryLocal.ptr === 0) {
      throw new Error(`Worker: Decoding geometry failed: ${lastStatus.error_msg()}`);
    }
    // console.log("decode geometry duration", performance.now() - startDecode);

    const geometry = { index: null, attributes: [] };

    // Gather all vertex attributes.
    const attributeIDs = {
      position: 'POSITION',
      normal: 'NORMAL',
      color: 'COLOR',
      uv: 'TEX_COORD',
      generic: 'GENERIC',
    };
    const attributeTypes = {
      position: 'Float32Array',
      normal: 'Float32Array',
      color: 'Float32Array',
      uv: 'Float32Array',
      generic: 'Float32Array',
    };
    const useUniqueIDs = false;
    for (const attributeName in attributeIDs) {
      const attributeType = self[attributeTypes[attributeName]];

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
        attributeID = decoder.GetAttributeId(dracoGeometryLocal, draco[attributeIDs[attributeName]]);

        if (attributeID === -1) continue;

        attribute = decoder.GetAttribute(dracoGeometryLocal, attributeID);
      }

      geometry.attributes.push(
        decodeAttribute(draco, decoder, dracoGeometryLocal, attributeName, attributeType, attribute)
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
      throw new Error('Worker: Mesh info already exists.');
    }

    const startDecode = performance.now();
    const bufferArray = new Int8Array(buffer);
    baseArray = bufferArray;

    dracoHeader = new draco.DracoHeader();
    let lastStatus = decoder.DecodeArrayToDracoHeader(bufferArray, bufferArray.length, dracoHeader);

    if (!lastStatus.ok() || dracoHeader.ptr === 0) {
      throw new Error(`Worker: Decoding header failed: ${lastStatus.error_msg()}`);
    }

    switch (dracoHeader.GetEncoderType()) {
      case draco.TRIANGULAR_MESH:
        dracoGeometry = new draco.Mesh();
        lastStatus = decoder.DecodeArrayAttrToMesh(bufferArray, bufferArray.length, dracoHeader, name, dracoGeometry);
        break;
      case draco.POINT_CLOUD:
        dracoGeometry = new draco.PointCloud();
        lastStatus = decoder.DecodeArrayToPointCloud(baseArray, baseArray.byteLength, dracoGeometry);
        break;
      default:
        throw new Error('Worker: Unexpected geometry type.');
        break;
    }

    if (!lastStatus.ok() || dracoGeometry.ptr === 0) {
      throw new Error(`Worker: Decoding geometry failed: ${lastStatus.error_msg()}`);
    }

    // console.log("decode geometry duration", performance.now() - startDecode);
  }

  /* DecodePointAttributes */
  function DecodePointAttributes(draco, decoder, buffer, name) {
    if (!dracoGeometry || !dracoHeader) {
      throw new Error('Worker: Mesh info not exists.');
    }

    const startDecode = performance.now();
    const bufferArray = new Int8Array(buffer);

    switch (dracoHeader.GetEncoderType()) {
      case draco.TRIANGULAR_MESH:
        lastStatus = decoder.DecodeArrayAttrToMesh(bufferArray, bufferArray.length, dracoHeader, name, dracoGeometry);
        break;
      case draco.POINT_CLOUD:
        break;
      default:
        throw new Error('Worker: Unexpected geometry type.');
    }

    if (!lastStatus.ok() || dracoGeometry.ptr === 0) {
      throw new Error(`Worker: Decoding ${name} failed: ${lastStatus.error_msg()}`);
    }

    // console.log("decode attribute duration", performance.now() - startDecode);
    const attributeName = name;
    const attributeType = Float32Array;
    const attributeID = decoder.GetAttributeIdByName(dracoGeometry, attributeName);
    if (attributeID === -1) throw new Error('THREE.DRACOLoader: Unexpected attribute ID.');

    const attribute = decoder.GetAttribute(dracoGeometry, attributeID);
    const geometry = {
      index: null,
      attribute: decodeAttribute(draco, decoder, dracoGeometry, attributeName, attributeType, attribute),
    };

    // Add index.
    if (name == 'position' && dracoHeader.GetEncoderType() === draco.TRIANGULAR_MESH) {
      geometry.index = decodeIndex(draco, decoder, dracoGeometry);
    }

    // draco.destroy(dracoGeometry);
    return geometry;
  }

  function decodeIndex(draco, decoder, dracoGeometry) {
    const numFaces = dracoGeometry.num_faces();
    const numIndices = numFaces * 3;
    const byteLength = numIndices * 4;

    const ptr = draco._malloc(byteLength);
    decoder.GetTrianglesUInt32Array(dracoGeometry, byteLength, ptr);
    const index = new Uint32Array(draco.HEAPF32.buffer, ptr, numIndices).slice();
    draco._free(ptr);

    return { array: index, itemSize: 1 };
  }

  function decodeAttribute(draco, decoder, dracoGeometry, attributeName, attributeType, attribute) {
    const numComponents = attribute.num_components();
    const numPoints = dracoGeometry.num_points();
    const numValues = numPoints * numComponents;
    const byteLength = numValues * attributeType.BYTES_PER_ELEMENT;
    const dataType = getDracoDataType(draco, attributeType);

    const ptr = draco._malloc(byteLength);
    decoder.GetAttributeDataArrayForAllPoints(dracoGeometry, attribute, dataType, byteLength, ptr);
    const array = new attributeType(draco.HEAPF32.buffer, ptr, numValues).slice();
    draco._free(ptr);

    return {
      name: attributeName,
      array,
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
