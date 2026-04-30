"use client";

import { useRef, useState } from "react";
import { ImagePlus, UploadCloud, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MediaUploaderProps = {
  onFilesSelected: (files: FileList | File[]) => void;
  className?: string;
};

export function MediaUploader({ onFilesSelected, className }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (event.dataTransfer.files?.length) {
          onFilesSelected(event.dataTransfer.files);
        }
      }}
      className={cn(
        "rounded-[28px] border border-dashed px-6 py-8 transition-all",
        dragging
          ? "border-slate-900 bg-slate-950 text-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.6)]"
          : "border-slate-200 bg-white/85",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*"
        multiple
        onChange={(event) => {
          if (event.target.files?.length) {
            onFilesSelected(event.target.files);
          }
        }}
      />

      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-full",
            dragging ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
          )}
        >
          <UploadCloud className="size-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Upload images and videos</h3>
        <p className={cn("mt-2 text-sm leading-6", dragging ? "text-white/75" : "text-slate-500")}>
          Build a web-native gallery for the itinerary. Drop scenic imagery, hotel visuals, short clips, or upload from your file picker.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="size-4" />
            Choose files
          </Button>
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            <Video className="size-4" />
            Add videos
          </Button>
        </div>
      </div>
    </div>
  );
}
