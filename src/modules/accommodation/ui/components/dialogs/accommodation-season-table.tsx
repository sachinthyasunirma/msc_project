"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SeasonOption } from "@/modules/season/lib/season-api";

type AccommodationSeasonTableProps = {
  seasons: SeasonOption[];
  onEditSeason: (season: SeasonOption) => void;
  onDeleteSeason: (season: SeasonOption) => void;
};

export function AccommodationSeasonTable({
  seasons,
  onEditSeason,
  onDeleteSeason,
}: AccommodationSeasonTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Range</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {seasons.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">No seasons found.</TableCell>
          </TableRow>
        ) : (
          seasons.map((season) => (
            <TableRow key={season.id}>
              <TableCell>{season.name}</TableCell>
              <TableCell>{season.startDate} to {season.endDate}</TableCell>
              <TableCell>{season.description || "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEditSeason(season)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => onDeleteSeason(season)}>Delete</Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
