import { DRACOLoader, GLTFLoader, type GLTF } from "three-stdlib";
import { decryptFile } from "../Character/utils/decrypt";
import type { ModelConfig } from "./config";

/** Loads the GLB / GLTF of the config (decrypting it first when it has a password). Rejects on any failure. */
export async function loadModel(cfg: ModelConfig): Promise<GLTF> {
  const base = import.meta.env.BASE_URL;
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(`${base}draco/`);
  loader.setDRACOLoader(draco);
  try {
    if (cfg.password) {
      const bytes = await decryptFile(`${base}${cfg.url.replace(/^\/+/, "")}`, cfg.password);
      const blobUrl = URL.createObjectURL(new Blob([bytes]));
      try {
        return await loader.loadAsync(blobUrl);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    }
    return await loader.loadAsync(`${base}${cfg.url.replace(/^\/+/, "")}`);
  } finally {
    draco.dispose();
  }
}
