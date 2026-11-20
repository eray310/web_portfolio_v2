import { useState } from "react";
import { MdArrowOutward, MdPlayArrow } from "react-icons/md";

interface Props {
  image?: string;
  alt?: string;
  video?: string;
  link?: string;
  /** Full video URL; when set, the card shows a video preview and calls onOpen on click. */
  videoSrc?: string;
  onOpen?: () => void;
}

const WorkImage = (props: Props) => {
  if (props.videoSrc && props.onOpen) {
    return (
      <div className="work-image">
        <button
          type="button"
          className="work-image-in work-image-play"
          onClick={props.onOpen}
          aria-label={`${props.alt ?? "Video"} videosunu oynat`}
          data-cursor="disable"
        >
          <video
            className="work-image-preview"
            src={`${props.videoSrc}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            draggable={false}
          />
          <div className="work-link work-play-icon">
            <MdPlayArrow />
          </div>
        </button>
      </div>
    );
  }

  const [isVideo, setIsVideo] = useState(false);
  const [video, setVideo] = useState("");
  const handleMouseEnter = async () => {
    if (props.video) {
      setIsVideo(true);
      const response = await fetch(`src/assets/${props.video}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setVideo(blobUrl);
    }
  };

  return (
    <div className="work-image">
      <a
        className="work-image-in"
        href={props.link}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVideo(false)}
        target="_blank"
        data-cursor={"disable"}
      >
        {props.link && (
          <div className="work-link">
            <MdArrowOutward />
          </div>
        )}
        <img src={props.image} alt={props.alt} draggable={false} />
        {isVideo && <video src={video} autoPlay muted playsInline loop></video>}
      </a>
    </div>
  );
};

export default WorkImage;
