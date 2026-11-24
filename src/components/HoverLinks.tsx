import "./styles/style.css";

// The second copy only exists for the hover slide; screen readers must not read the label twice.
const HoverLinks = ({ text, cursor }: { text: string; cursor?: boolean }) => {
  return (
    <span className="hover-link" data-cursor={!cursor && `disable`}>
      <span className="hover-in">
        {text}
        <span aria-hidden="true">{text}</span>
      </span>
    </span>
  );
};

export default HoverLinks;
