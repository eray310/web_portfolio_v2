import { toolGroups } from "../data/tools";
import "./styles/ToolsFallback.css";

/** Static replacement for the 3D tool balls. */
const ToolsFallback = () => (
  <div className="tools-fallback">
    <h2>Kullandığım Araçlar</h2>
    <dl className="tools-groups">
      {toolGroups.map((g) => (
        <div key={g.title}>
          <dt>{g.title}</dt>
          <dd>{g.items.join(" · ")}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export default ToolsFallback;
