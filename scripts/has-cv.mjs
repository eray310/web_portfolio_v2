// true when public/cv/Eray_Omeroglu_CV.pdf exists (the Hakkimda page only asks for the CV and shows its buttons then)
import { existsSync } from "node:fs";

export const hasCv = existsSync(new URL("../public/cv/Eray_Omeroglu_CV.pdf", import.meta.url));
