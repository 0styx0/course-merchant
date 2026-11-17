"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { StudentOrder } from "./students-in-order";

const studentOrderLabels: Record<StudentOrder, string> = {
  newest: "Newest enrolled first",
  oldest: "Oldest enrolled first",
  active: "Active first",
  attention: "Needs attention first",
};

// The menu lists the orders in this order.
const studentOrders: StudentOrder[] = [
  "newest",
  "oldest",
  "active",
  "attention",
];

type StudentOrderMenuProps = {
  order: StudentOrder;
  onOrderChange: (order: StudentOrder) => void;
};

/**
 * The "Sort by" menu over the Students list. Select gets the labels as
 * `items`, so the server-rendered trigger reads "Newest enrolled first"
 * rather than "newest". Its trigger and options are 44px tall below the
 * medium breakpoint, for a thumb.
 */
export function StudentOrderMenu({
  order,
  onOrderChange,
}: StudentOrderMenuProps) {
  return (
    <Select
      items={studentOrderLabels}
      value={order}
      // Base UI types a single select's pick as nullable; every option here has an order.
      onValueChange={(pickedOrder) => pickedOrder && onOrderChange(pickedOrder)}
    >
      <div className="flex items-center gap-2">
        {/* The ui file's SelectLabel labels an option group; this primitive names the trigger. */}
        <SelectPrimitive.Label className="text-muted-foreground">
          Sort by
        </SelectPrimitive.Label>
        <SelectTrigger className="data-[size=default]:h-11 md:data-[size=default]:h-8">
          <SelectValue />
        </SelectTrigger>
      </div>
      <SelectContent>
        {studentOrders.map((studentOrder) => (
          <SelectItem
            key={studentOrder}
            value={studentOrder}
            className="min-h-11 md:min-h-8"
          >
            {studentOrderLabels[studentOrder]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
