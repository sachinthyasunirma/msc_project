"use client";

import { Edit3, ImageIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { HotelImage } from "@/modules/accommodation/lib/accommodation-api";

type ImagesTabProps = {
  loadingDetails: boolean;
  images: HotelImage[];
  isReadOnly: boolean;
  onAddImage: () => void;
  onEditImage: (row: HotelImage) => void;
  onDeleteImage: (row: HotelImage) => void;
};

export function ImagesTab({
  loadingDetails,
  images,
  isReadOnly,
  onAddImage,
  onEditImage,
  onDeleteImage,
}: ImagesTabProps) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end">
        <Button onClick={onAddImage} disabled={isReadOnly} title={isReadOnly ? "View only mode" : undefined}>
          <Plus className="mr-2 size-4" />
          Add Image
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Preview</TableHead>
            <TableHead>Caption</TableHead>
            <TableHead>Primary</TableHead>
            <TableHead className="text-right">Order</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loadingDetails ? (
            <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
          ) : images.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No images.</TableCell></TableRow>
          ) : (
            images.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <a href={item.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary">
                    <ImageIcon className="size-4" />
                    Open
                  </a>
                </TableCell>
                <TableCell>{item.caption || "-"}</TableCell>
                <TableCell>{item.isPrimary ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right">{item.order}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEditImage(item)}>
                      <Edit3 className="size-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDeleteImage(item)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
