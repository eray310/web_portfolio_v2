import { useState, useCallback } from "react";
import { MdPlayArrow } from "react-icons/md";
import VideoModal from "./VideoModal";
import "./styles/Work.css";

type Project = {
  title: string;
  /** One or two short sentences about the work. */
  description: string;
  /** Video file inside `public/portfolio/`. */
  video: string;
  /** Optional cover image inside `public/portfolio/`. Without it the first frame of the video is shown. */
  poster?: string;
};

const fileUrl = (file: string) =>
  `${import.meta.env.BASE_URL}portfolio/${file}`;

/**
 * Selected works. To add a video: copy the file into `public/portfolio/` and
 * add ONE entry here; the card, its size and the player come from this line.
 * Videos keep their own shape (vertical or horizontal) inside a card of the
 * same size.
 */
const projects: Project[] = [
  {
    title: "Allesta | Yapay Zekâ Destekli Reklam",
    description:
      "Allesta için hazırladığım reklam videosunda yapay zekâ destekli görselleri kurgu ve hareketli grafiklerle birleştirdim. Geçişleri, ana mesajın kısa sürede anlaşılacağı bir akışa göre kurguladım.",
    video: "Allesta_YZReklam.mp4",
    poster: "Allesta_YZReklam.jpg",
  },
  {
    title: "Allvex | Sosyal Medya Videosu",
    description:
      "Allvex için hazırladığım dikey videoda görüntü seçimini, kesme ritmini ve metin yerleşimini mobil izleme deneyimine göre kurguladım.",
    video: "Allvex_Reels4.mp4",
    poster: "Allvex_Reels4.jpg",
  },
  {
    title: "Elaris | Sosyal Medya Videosu",
    description:
      "Elaris için hazırladığım kısa videoda planları akıcı bir sırayla birleştirdim. Kurgu ritmini ve metinleri, projenin öne çıkan detaylarını mobilde rahat izletecek şekilde düzenledim.",
    video: "Elaris_Reels_22.mp4",
    poster: "Elaris_Reels_22.jpg",
  },
  {
    title: "RES360 | Proje Tanıtım Videosu",
    description:
      "Gayrimenkul projelerinin kartlarını, görsellerini ve ekran geçişlerini hareketli grafiklerle tek bir akışta birleştiren video çalışması. Projeler arasındaki geçişler, bilgiyi kısa sürede takip edilecek şekilde kuruldu.",
    video: "Res__360.mp4",
    poster: "Res__360.jpg",
  },
];

type Opened = { project: Project; ratio?: number };

const WorkCard = ({
  project,
  index,
  onOpen,
}: {
  project: Project;
  index: number;
  onOpen: (ratio?: number) => void;
}) => {
  // Shape of the video (width / height), read from the cover or the first frame.
  const [ratio, setRatio] = useState<number>();
  const poster = project.poster && fileUrl(project.poster);

  return (
    <article className="work-card">
      <button
        type="button"
        className="work-media"
        style={
          poster
            ? ({ "--poster": `url("${poster}")` } as React.CSSProperties)
            : undefined
        }
        onClick={() => onOpen(ratio)}
        aria-label={`${project.title} videosunu oynat`}
        data-cursor="disable"
      >
        {poster ? (
          <img
            src={poster}
            alt=""
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            onLoad={(e) =>
              setRatio(
                e.currentTarget.naturalWidth / e.currentTarget.naturalHeight
              )
            }
          />
        ) : (
          <video
            src={`${fileUrl(project.video)}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            draggable={false}
            onLoadedMetadata={(e) =>
              setRatio(e.currentTarget.videoWidth / e.currentTarget.videoHeight)
            }
          />
        )}
        <span className="work-play" aria-hidden="true">
          <MdPlayArrow />
        </span>
      </button>
      <div className="work-info">
        <h3>{project.title}</h3>
        <p>{project.description}</p>
      </div>
    </article>
  );
};

const Work = () => {
  const [opened, setOpened] = useState<Opened | null>(null);
  const closeVideo = useCallback(() => setOpened(null), []);

  return (
    <div className="work-section" id="work">
      <div className="work-container section-container">
        <h2>
          Seçili <span>İşler</span>
        </h2>

        <div className="work-grid">
          {projects.map((project, index) => (
            <WorkCard
              key={project.video}
              project={project}
              index={index}
              onOpen={(ratio) => setOpened({ project, ratio })}
            />
          ))}
        </div>
      </div>
      {opened && (
        <VideoModal
          src={fileUrl(opened.project.video)}
          title={opened.project.title}
          ratio={opened.ratio}
          onClose={closeVideo}
        />
      )}
    </div>
  );
};

export default Work;
