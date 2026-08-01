import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "./ui/calendar";

export default function DatePicker({
  from,
  to,
  onSelect,
  numberOfMonths = 2,
}: {
  from: Date | undefined;
  to: Date | undefined;
  onSelect: (range: { from?: Date; to?: Date }) => void;
  numberOfMonths?: number;
}) {
  return (
    <>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              id="date-picker-range"
              className="justify-start px-2.5 font-normal"
            >
              <CalendarIcon data-icon="inline-start" />
              {from ? (
                to ? (
                  <>
                    {format(from, "LLL dd, y")} - {format(to, "LLL dd, y")}
                  </>
                ) : (
                  format(from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{
              from: from,
              to: to,
            }}
            onSelect={onSelect}
            numberOfMonths={numberOfMonths}
            required
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
