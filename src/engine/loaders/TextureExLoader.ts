import { ImageLoader, Loader, LoadingManager, RGBAFormat, RGBFormat, Texture } from "three";
import { isNode } from 'browser-or-node';

/**
 * Class for loading a texture.
 * Unlike other loaders, this one emits events instead of using predefined callbacks. 
 * So if you're interested in getting notified when things happen, you need to add listeners to the object.
 */
export class TextureExLoader extends Loader {
  constructor(manager?: LoadingManager) {
    super(manager);
  }

  load(
    url: string,
    onLoad?: (texture: Texture) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void
  ): Texture {
    const texture = new Texture();

    const loader = new ImageLoader(this.manager);
    loader.setCrossOrigin(this.crossOrigin);
    loader.setPath(this.path);

    loader.load(
      url,
      function (image) {
        if (isNode) {
          // Node.js env
          var canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          let ctx = canvas.getContext("2d");

          if (!ctx) {
            throw Error("TextureExLoader: no context.");
          }

          ctx.drawImage(image, 0, 0);
          let imgData = ctx.getImageData(0, 0, image.width, image.height);

          texture.image = imgData;
        } else {
          // Browser env
          texture.image = image;
        }

        // JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.
        const isJPEG = url.search(/\.jpe?g($|\?)/i) > 0 || url.search(/^data\:image\/jpeg/) === 0;

        texture.format = isJPEG ? RGBFormat : RGBAFormat;
        texture.needsUpdate = true;

        if (onLoad !== undefined) {
          onLoad(texture);
        }
      },
      onProgress,
      onError
    );

    return texture;
  }
}
