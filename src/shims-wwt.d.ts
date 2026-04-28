import { Color, RenderContext } from "@wwtelescope/engine";

declare module "@wwtelescope/engine" {
  export class Grids {
    static drawAltAzGrid(renderContext: RenderContext, opacity: number, drawColor: Color): void;
    static _makeAltAzGridText(): void;
    static _altAzTextBatch: Text3dBatch | null;
    static _milkyWayImage: Texture;
  }

  export class Text3dBatch {
    constructor(height: number);
  }

  export class Texture {
    static fromUrl(url: string): Texture;
  }
}
