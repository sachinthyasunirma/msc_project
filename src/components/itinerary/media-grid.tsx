"use client";

import { PlayCircle, Star, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { GalleryAssignment, ItineraryPreviewTarget, MediaAsset } from "@/lib/types/itinerary";

type MediaGridProps = {
  assets: MediaAsset[];
  assignments: GalleryAssignment[];
  previewTargets: ItineraryPreviewTarget[];
  coverMediaId: string | null;
  draggedMediaId: string | null;
  onDragStart: (mediaId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetMediaId: string) => void;
  onRemove: (mediaId: string) => void;
  onSetCover: (mediaId: string) => void;
  onUpdateMedia: (mediaId: string, patch: Partial<MediaAsset>) => void;
  onChangeAssignment: (mediaId: string, targetValue: string | null) => void;
};

export function MediaGrid({
  assets,
  assignments,
  previewTargets,
  coverMediaId,
  draggedMediaId,
  onDragStart,
  onDragEnd,
  onDrop,
  onRemove,
  onSetCover,
  onUpdateMedia,
  onChangeAssignment,
}: MediaGridProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {assets.map((asset) => {
        const assignment = assignments.find((entry) => entry.mediaId === asset.id) || null;
        const assignmentValue = assignment ? `${assignment.targetType}:${assignment.targetId}` : "__none__";
        const isCover = coverMediaId === asset.id;

        return (
          <article
            key={asset.id}
            draggable
            onDragStart={() => onDragStart(asset.id)}
            onDragEnd={onDragEnd}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDrop(asset.id)}
            className={cn(
              "overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.28)] transition-all",
              draggedMediaId === asset.id ? "opacity-60" : "hover:-translate-y-0.5"
            )}
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
              {asset.type === "video" ? (
                <>
                  <video
                    src={asset.url}
                    poster={asset.thumbnailUrl || undefined}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-white/90 p-3 shadow-lg">
                      <PlayCircle className="size-8 text-slate-900" />
                    </div>
                  </div>
                  {asset.durationLabel ? (
                    <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/75 px-2 py-1 text-[11px] font-semibold text-white">
                      {asset.durationLabel}
                    </span>
                  ) : null}
                </>
              ) : (
                <img src={asset.thumbnailUrl} alt={asset.altText || asset.title} className="h-full w-full object-cover" />
              )}
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  {asset.type}
                </span>
                {isCover ? (
                  <span className="rounded-full bg-amber-400 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-900">
                    Cover
                  </span>
                ) : null}
              </div>
              <div className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-500 shadow-sm">
                <GripVertical className="size-4" />
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-950">{asset.title}</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {asset.status === "uploading" ? `Uploading ${asset.uploadProgress}%` : "Ready to assign"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon" onClick={() => onSetCover(asset.id)}>
                    <Star className={cn("size-4", isCover ? "fill-amber-400 text-amber-400" : "")} />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => onRemove(asset.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {asset.status === "uploading" ? (
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${asset.uploadProgress}%` }} />
                </div>
              ) : null}

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Assign to</Label>
                  <Select
                    value={assignmentValue}
                    onValueChange={(value) => onChangeAssignment(asset.id, value === "__none__" ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose section target" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Not assigned yet</SelectItem>
                      {previewTargets.map((target) => (
                        <SelectItem key={`${target.type}:${target.id}`} value={`${target.type}:${target.id}`}>
                          {target.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Caption</Label>
                  <Input
                    value={asset.caption}
                    onChange={(event) => onUpdateMedia(asset.id, { caption: event.target.value })}
                    placeholder="Short editorial caption"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Alt text</Label>
                  <Input
                    value={asset.altText}
                    onChange={(event) => onUpdateMedia(asset.id, { altText: event.target.value })}
                    placeholder="Describe the media"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    value={asset.tags.join(", ")}
                    onChange={(event) =>
                      onUpdateMedia(asset.id, {
                        tags: event.target.value
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="hero, beach, family"
                  />
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
