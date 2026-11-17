import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminCourse } from "@/lib/types";

import {
  AccessPill,
  AttentionLines,
  EnrolledDate,
  PaidAmount,
  PaymentPill,
  StudentIdentity,
} from "./student-fields";
import { attentionLineWords } from "./words/attention-lines";

type StudentTableProps = {
  enrollments: AdminCourse["enrollments"];
  timeZone: string;
};

type StudentTableRowProps = {
  enrollment: AdminCourse["enrollments"][number];
  timeZone: string;
};

function StudentTableRow({ enrollment, timeZone }: StudentTableRowProps) {
  const lines = attentionLineWords(enrollment);
  return (
    <TableRow>
      <TableCell>
        <StudentIdentity customer={enrollment.customer} />
      </TableCell>
      <TableCell>
        <EnrolledDate enrolledAt={enrollment.enrolledAt} timeZone={timeZone} />
      </TableCell>
      <TableCell>
        <AccessPill access={enrollment} timeZone={timeZone} />
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <PaidAmount payment={enrollment.payment} />
      </TableCell>
      <TableCell>
        <PaymentPill payment={enrollment.payment} />
      </TableCell>
      <TableCell>
        {lines.length > 0 && <AttentionLines lines={lines} />}
      </TableCell>
    </TableRow>
  );
}

/**
 * Each student as a table row: who they are, when they enrolled, their
 * access, what they paid, the payment's state and what needs the owner's
 * action. A table too wide for the page scrolls inside its own box.
 */
export function StudentTable({ enrollments, timeZone }: StudentTableProps) {
  return (
    <Table className="mt-4">
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Enrolled</TableHead>
          <TableHead>Access</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead>Payment</TableHead>
          <TableHead>Attention</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {enrollments.map((enrollment) => (
          <StudentTableRow
            key={enrollment.customer.id}
            enrollment={enrollment}
            timeZone={timeZone}
          />
        ))}
      </TableBody>
    </Table>
  );
}
