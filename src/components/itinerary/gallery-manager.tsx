"use client";

import { ImagePlus, Images, Video } from "lucide-react";
import { EmptyState } from "@/components/itinerary/empty-state";
import { MediaGrid } from "@/components/itinerary/media-grid";
import { MediaUploader } from "@/components/itinerary/media-uploader";
import { SectionCard } from "@/components/itinerary/section-card";
import { Badge } from "@/components/ui/badge";
import type { GalleryAssignment, ItineraryPreviewTarget, MediaAsset } from "@/lib/types/itinerary";

type GalleryManagerProps = {
  assets: MediaAsset[];
  assignments: GalleryAssignment[];
  previewTargets: ItineraryPreviewTarget[];
  coverMediaId: string | null;
  draggedMediaId: string | null;
  onFilesSelected: (files: FileList | File[]) => void;
  onDragStart: (mediaId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetMediaId: string) => void;
  onRemove: (mediaId: string) => void;
  onSetCover: (mediaId: string) => void;
  onUpdateMedia: (mediaId: string, patch: Partial<MediaAsset>) => void;
  onChangeAssignment: (mediaId: string, targetValue: string | null) => void;
};

export function GalleryManager(props: GalleryManagerProps) {
  const imageCount = props.assets.filter((asset) => asset.type === "image").length;
  const videoCount = props.assets.filter((asset) => asset.type === "video").length;

  return (
    <SectionCard
      eyebrow="Gallery"
      title="Media manager"
      description="Use rich, web-native media to elevate the itinerary beyond a static PDF. Upload scenic photos, hotel imagery, and short videos, then assign them to the right touchpoints."
      toolbar={
        <>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            <Images className="size-3.5" />
            {imageCount} images
          </Badge>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            <Video className="size-3.5" />
            {videoCount} videos
          </Badge>
        </>
      }
    >
      <MediaUploader onFilesSelected={props.onFilesSelected} />

      {props.assets.length === 0 ? (
        <EmptyState
          title="Start the gallery"
          description="Upload beautiful imagery and short clips, then pin the strongest asset as the hero to turn this itinerary into a more immersive web experience."
          icon={<ImagePlus className="size-6" />}
        />
      ) : (
        <MediaGrid {...props} />
      )}
    </SectionCard>
  );
}
