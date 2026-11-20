import { tools } from "../data/tools";
import "./styles/ToolsFallback.css";

/** Static replacement for the 3D tool balls. */
const ToolsFallback = () => (
  <div className="tools-fallback">
    <h2>Kullandığım Araçlar</h2>
    <ul>
      {tools.map((tool) => (
        <li key={tool.name}>{tool.name}</li>
      ))}
    </ul>
  </div>
);

export default ToolsFallback;
