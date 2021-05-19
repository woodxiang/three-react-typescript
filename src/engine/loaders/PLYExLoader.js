/**
 * @author Arton
 *
 * Description: A THREE loader for simple binary PLY files.
 *
 * Limitations: This decoder is for Node.js, don't use this in browser.
 *  This decoder is for binary PLY files.
 *
 * Usage:
 *	var loader = new PLYExLoader();
 *	loader.load('./models/ply/binary/test.ply', function (geometry) {
 *		scene.add( new THREE.Mesh( geometry ) );
 *	} );
 *
 */

import axios from "axios";
import { Uint32BufferAttribute } from "three";
import { BufferGeometry, Float32BufferAttribute, Loader } from "three";

const genericAttrs = [
  "generic",
  "filling_seq",
  "liq_track_sur",
  "P",
  "tau_sma",
  "temperature",
  "umag",
  "vof_sf",
];

var PLYExLoader = function (manager) {
  Loader.call(this, manager);

  this.propertyNameMapping = {};
  this.cancelSource = undefined;
};

PLYExLoader.prototype = Object.assign(Object.create(Loader.prototype), {
  constructor: PLYExLoader,

  loadAsync: function (url, onLoad, onProgress, onError) {
    var scope = this;

    return new Promise((resolve, reject) => {
      const cancelToken = axios.CancelToken;
      scope.cancelSource = cancelToken.source();
      axios
        .get(url, {
          responseType: "arraybuffer",
          onDownloadProgress: onProgress,
          cancelToken: scope.cancelSource.token,
        })
        .then((resp) => {
          const geometry = scope.parse(resp.data);
          if (onLoad) onLoad(geometry);
          resolve(geometry);
        })
        .catch((r) => {
          if (onError) onError(r);
          reject(r);
        });
    });
  },

  parse: function (data) {
    function parseHeader(data) {
      var patternHeader = /ply([\s\S]*)end_header\r?\n/;
      var headerText = "";
      var headerLength = 0;
      var result = patternHeader.exec(data);

      if (result !== null) {
        headerText = result[1];
        headerLength = result[0].length;
      }

      var header = {
        comments: [],
        elements: [],
        headerLength: headerLength,
      };

      var lines = headerText.split("\n");
      var currentElement;
      var lineType, lineValues;

      function make_ply_element_property(propertValues) {
        var property = { type: propertValues[0] };

        if (property.type === "list") {
          property.name = propertValues[3];
          property.countType = propertValues[1];
          property.itemType = propertValues[2];
        } else {
          property.name = propertValues[1];
        }

        return property;
      }

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        line = line.trim();

        if (line === "") continue;

        lineValues = line.split(/\s+/);
        lineType = lineValues.shift();
        line = lineValues.join(" ");

        switch (lineType) {
          case "format":
            header.format = lineValues[0];
            header.version = lineValues[1];
            break;
          case "comment":
            header.comments.push(line);
            break;
          case "element":
            if (currentElement !== undefined) header.elements.push(currentElement);
            currentElement = {};
            currentElement.name = lineValues[0];
            currentElement.count = parseInt(lineValues[1]);
            currentElement.properties = [];
            break;
          case "property":
            currentElement.properties.push(make_ply_element_property(lineValues));
            break;
          default:
            console.log("unhandled", lineType, lineValues);
        }
      }

      if (currentElement !== undefined) header.elements.push(currentElement);

      return header;
    }

    function initBuffer(header, buffer) {
      function buf2Float32Array(buf) {
        return new Float32Array(
          buf.buffer,
          buf.byteOffset,
          buf.length / Float32Array.BYTES_PER_ELEMENT
        );
      }
      function buf2Uint32Array(buf) {
        return new Uint32Array(
          buf.buffer,
          buf.byteOffset,
          buf.length / Uint32Array.BYTES_PER_ELEMENT
        );
      }
      for (let i in header.elements) {
        const element = header.elements[i];
        switch (element.name) {
          case "vertex":
            for (let j in element.properties) {
              const prop = element.properties[j];
              if (genericAttrs.indexOf(prop.name) > -1) {
                buffer.generic = buf2Float32Array(Buffer.alloc(element.count * 4));
              }
            }
            buffer.position = buf2Float32Array(Buffer.alloc(element.count * 12));
            break;
          case "face":
            const prop = element.properties[0];
            if (prop?.type != "list" || prop?.itemType != "int") {
              throw Error("face property type error.");
            }
            buffer.index = buf2Uint32Array(Buffer.alloc(element.count * 12)); // list uchar int
            break;
        }
      }
    }

    function parseBinaryLE(data, header, buffer) {
      let pos = header.headerLength;
      for (let i in header.elements) {
        const element = header.elements[i];
        switch (element.name) {
          case "vertex":
            for (let j = 0, k = 0; j < element.count; j++) {
              buffer.position[k++] = data.readFloatLE(pos);
              pos += 4;
              buffer.position[k++] = data.readFloatLE(pos);
              pos += 4;
              buffer.position[k++] = data.readFloatLE(pos);
              pos += 4;
              if (buffer.generic) {
                buffer.generic[j] = data.readFloatLE(pos);
                pos += 4;
              }
            }
            break;
          case "face":
            pos += 1;
            for (let j = 0, k = 0; j < element.count; j++) {
              buffer.index[k++] = data.readUInt32LE(pos);
              pos += 4;
              buffer.index[k++] = data.readUInt32LE(pos);
              pos += 4;
              buffer.index[k++] = data.readUInt32LE(pos);
              pos += 5;
            }
            break;
        }
      }
    }

    function parseBinaryBE(data, header, buffer) {
      throw Error("binary_big_endian is not supported.");
    }

    let header = parseHeader(data);
    let buffer = {};
    initBuffer(header, buffer);

    if (header.format === "binary_little_endian" || header.format === "binary_big_endian") {
      if (header.format === "binary_little_endian") {
        parseBinaryLE(data, header, buffer);
      } else {
        parseBinaryBE(data, header, buffer);
      }
    } else {
      throw Error(`${header.format} format is not supported.`);
    }

    let geometry = new BufferGeometry();
    if (buffer.index) {
      geometry.setIndex(new Uint32BufferAttribute(buffer.index, 1));
    }
    if (buffer.position) {
      geometry.setAttribute("position", new Float32BufferAttribute(buffer.position, 3));
    }
    if (buffer.generic) {
      geometry.setAttribute("generic", new Float32BufferAttribute(buffer.generic, 1));
    }
    geometry.computeVertexNormals();
    return geometry;
  },

  cancel: function () {
    this.cancelSource?.cancel();
  },
});

export default PLYExLoader;
