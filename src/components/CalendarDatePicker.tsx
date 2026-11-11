// src/components/calendar-date-picker.tsx

"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
  isSameDay,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { DateRange } from "react-day-picker";
import { cva, VariantProps } from "class-variance-authority";

import { BUSINESS_TIMEZONE } from "@/lib/business-time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const multiSelectVariants = cva(
  "flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium text-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground text-background",
        link: "text-primary underline-offset-4 hover:underline text-background",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
);

interface CalendarDatePickerProps
  extends React.HTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof multiSelectVariants> {
  id?: string;
  className?: string;
  date: DateRange;
  disabled?: boolean | ((date: Date) => boolean);
  closeOnSelect?: boolean;
  numberOfMonths?: 1 | 2;
  yearsRange?: number;
  /**
   * Days follow this timezone, not the browser's, so a picked day means the
   * same thing to the server whatever device picked it.
   */
  timeZone?: string;
  /** `from` is the start of the first day and `to` the end of the last. */
  onDateSelect: (range: { from: Date; to: Date }) => void;
  /** Shown on the button while no date is picked. */
  placeholder?: string;
  /**
   * Adds an "All Time" preset that calls this, for pickers where no range is
   * a valid choice. It shows as selected while no date is picked.
   */
  onClear?: () => void;
}

export const CalendarDatePicker = React.forwardRef<
  HTMLButtonElement,
  CalendarDatePickerProps
>(
  (
    {
      id = "calendar-date-picker",
      className,
      date,
      disabled,
      closeOnSelect = false,
      numberOfMonths = 2,
      yearsRange = 10,
      timeZone = BUSINESS_TIMEZONE,
      onDateSelect,
      placeholder = "Pick a date",
      onClear,
      variant,
      ...props
    },
    ref
  ) => {
    // Inside the picker, dates are plain local dates whose year, month, and
    // day are the calendar date in `timeZone`. `date` comes in as real
    // instants and `emit` sends instants back out; nothing else converts.
    const toView = (d?: Date) => (d ? toZonedTime(d, timeZone) : undefined);
    const view: DateRange = { from: toView(date?.from), to: toView(date?.to) };
    const emit = (from: Date, to: Date) =>
      onDateSelect({
        from: fromZonedTime(startOfDay(from), timeZone),
        to: fromZonedTime(endOfDay(to), timeZone),
      });

    // Today's date in `timeZone`, so presets agree with the server's days.
    const today = toView(new Date())!;

    // With nothing picked, the month and year menus start at today.
    const initialFrom = view.from ?? today;
    const initialTo = (numberOfMonths === 2 ? view.to : view.from) ?? today;

    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [monthFrom, setMonthFrom] = React.useState<Date | undefined>(
      initialFrom
    );
    const [yearFrom, setYearFrom] = React.useState<number | undefined>(
      initialFrom.getFullYear()
    );
    const [monthTo, setMonthTo] = React.useState<Date | undefined>(initialTo);
    const [yearTo, setYearTo] = React.useState<number | undefined>(
      initialTo.getFullYear()
    );
    const [highlightedPart, setHighlightedPart] = React.useState<string | null>(
      null
    );

    const handleClose = () => setIsPopoverOpen(false);

    const selectDateRange = (from: Date, to: Date) => {
      emit(from, numberOfMonths === 2 ? to : from);
      setMonthFrom(from);
      setYearFrom(from.getFullYear());
      setMonthTo(to);
      setYearTo(to.getFullYear());
      closeOnSelect && setIsPopoverOpen(false);
    };

    const handleDateSelect = (range: DateRange | undefined) => {
      if (range?.from) {
        let from = range.from;
        let to = range.to ?? range.from;
        if (numberOfMonths === 1) {
          // One day at a time: take whichever end of the range just changed.
          if (!view.from || !isSameDay(range.from, view.from)) {
            to = from;
          } else {
            from = to;
          }
        }
        emit(from, to);
        setMonthFrom(from);
        setYearFrom(from.getFullYear());
        setMonthTo(to);
        setYearTo(to.getFullYear());
      }
    };

    const handleMonthChange = (newMonthIndex: number, part: string) => {
      if (part === "from") {
        if (yearFrom !== undefined) {
          if (newMonthIndex < 0 || newMonthIndex > yearsRange + 1) return;
          const newMonth = new Date(yearFrom, newMonthIndex, 1);
          const from =
            numberOfMonths === 2
              ? startOfMonth(newMonth)
              : view.from
                ? new Date(
                  view.from.getFullYear(),
                  newMonth.getMonth(),
                  view.from.getDate()
                )
                : newMonth;
          const to =
            numberOfMonths === 2 ? view.to ?? endOfMonth(newMonth) : from;
          if (from <= to) {
            emit(from, to);
            setMonthFrom(newMonth);
            setMonthTo(view.to);
          }
        }
      } else {
        if (yearTo !== undefined) {
          if (newMonthIndex < 0 || newMonthIndex > yearsRange + 1) return;
          const newMonth = new Date(yearTo, newMonthIndex, 1);
          const from = view.from ?? startOfMonth(newMonth);
          const to = numberOfMonths === 2 ? endOfMonth(newMonth) : from;
          if (from <= to) {
            emit(from, to);
            setMonthTo(newMonth);
            setMonthFrom(view.from);
          }
        }
      }
    };

    const handleYearChange = (newYear: number, part: string) => {
      if (part === "from") {
        if (years.includes(newYear)) {
          const newMonth = monthFrom
            ? new Date(newYear, monthFrom ? monthFrom.getMonth() : 0, 1)
            : new Date(newYear, 0, 1);
          const from =
            numberOfMonths === 2
              ? startOfMonth(newMonth)
              : view.from
                ? new Date(newYear, newMonth.getMonth(), view.from.getDate())
                : newMonth;
          const to =
            numberOfMonths === 2 ? view.to ?? endOfMonth(newMonth) : from;
          if (from <= to) {
            emit(from, to);
            setYearFrom(newYear);
            setMonthFrom(newMonth);
            setYearTo(view.to?.getFullYear());
            setMonthTo(view.to);
          }
        }
      } else {
        if (years.includes(newYear)) {
          const newMonth = monthTo
            ? new Date(newYear, monthTo.getMonth(), 1)
            : new Date(newYear, 0, 1);
          const from = view.from ?? startOfMonth(newMonth);
          const to = numberOfMonths === 2 ? endOfMonth(newMonth) : from;
          if (from <= to) {
            emit(from, to);
            setYearTo(newYear);
            setMonthTo(newMonth);
            setYearFrom(view.from?.getFullYear());
            setMonthFrom(view.from);
          }
        }
      }
    };

    const years = Array.from(
      { length: yearsRange + 1 },
      (_, i) => today.getFullYear() - yearsRange / 2 + i
    );

    const dateRanges = [
      { label: "Today", start: today, end: today },
      { label: "Yesterday", start: subDays(today, 1), end: subDays(today, 1) },
      {
        label: "This Week",
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(today, { weekStartsOn: 1 }),
      },
      {
        label: "Last Week",
        start: subDays(startOfWeek(today, { weekStartsOn: 1 }), 7),
        end: subDays(endOfWeek(today, { weekStartsOn: 1 }), 7),
      },
      { label: "Last 7 Days", start: subDays(today, 6), end: today },
      {
        label: "This Month",
        start: startOfMonth(today),
        end: endOfMonth(today),
      },
      {
        label: "Last Month",
        start: startOfMonth(subDays(today, today.getDate())),
        end: endOfMonth(subDays(today, today.getDate())),
      },
      { label: "This Year", start: startOfYear(today), end: endOfYear(today) },
      {
        label: "Last Year",
        start: startOfYear(subDays(today, 365)),
        end: endOfYear(subDays(today, 365)),
      },
    ];

    // The preset matching the range shown, however it was picked.
    const selectedRange =
      view.from && view.to
        ? dateRanges.find(
          ({ start, end }) =>
            isSameDay(start, view.from!) && isSameDay(end, view.to!)
        )?.label ?? null
        : null;

    const handleMouseOver = (part: string) => {
      // setHighlightedPart(part);
    };

    const handleMouseLeave = () => {
      // setHighlightedPart(null);
    };

    const handleWheel = (event: React.WheelEvent, part: string) => {
      event.preventDefault();
      if (!view.from || !view.to) return;
      if (highlightedPart === "firstDay") {
        const newDate = new Date(view.from);
        const increment = event.deltaY > 0 ? -1 : 1;
        newDate.setDate(newDate.getDate() + increment);
        if (newDate <= view.to) {
          numberOfMonths === 2
            ? emit(newDate, view.to)
            : emit(newDate, newDate);
          setMonthFrom(newDate);
        } else if (newDate > view.to && numberOfMonths === 1) {
          emit(newDate, newDate);
          setMonthFrom(newDate);
        }
      } else if (highlightedPart === "firstMonth") {
        const currentMonth = monthFrom ? monthFrom.getMonth() : 0;
        const newMonthIndex = currentMonth + (event.deltaY > 0 ? -1 : 1);
        handleMonthChange(newMonthIndex, "from");
      } else if (highlightedPart === "firstYear" && yearFrom !== undefined) {
        const newYear = yearFrom + (event.deltaY > 0 ? -1 : 1);
        handleYearChange(newYear, "from");
      } else if (highlightedPart === "secondDay") {
        const newDate = new Date(view.to);
        const increment = event.deltaY > 0 ? -1 : 1;
        newDate.setDate(newDate.getDate() + increment);
        if (newDate >= view.from) {
          emit(view.from, newDate);
          setMonthTo(newDate);
        }
      } else if (highlightedPart === "secondMonth") {
        const currentMonth = monthTo ? monthTo.getMonth() : 0;
        const newMonthIndex = currentMonth + (event.deltaY > 0 ? -1 : 1);
        handleMonthChange(newMonthIndex, "to");
      } else if (highlightedPart === "secondYear" && yearTo !== undefined) {
        const newYear = yearTo + (event.deltaY > 0 ? -1 : 1);
        handleYearChange(newYear, "to");
      }
    };

    React.useEffect(() => {
      const firstDayElement = document.getElementById(`firstDay-${id}`);
      const firstMonthElement = document.getElementById(`firstMonth-${id}`);
      const firstYearElement = document.getElementById(`firstYear-${id}`);
      const secondDayElement = document.getElementById(`secondDay-${id}`);
      const secondMonthElement = document.getElementById(`secondMonth-${id}`);
      const secondYearElement = document.getElementById(`secondYear-${id}`);

      const elements = [
        firstDayElement,
        firstMonthElement,
        firstYearElement,
        secondDayElement,
        secondMonthElement,
        secondYearElement,
      ];

      const addPassiveEventListener = (element: HTMLElement | null) => {
        if (element) {
          element.addEventListener(
            "wheel",
            handleWheel as unknown as EventListener,
            {
              passive: false,
            }
          );
        }
      };

      elements.forEach(addPassiveEventListener);

      return () => {
        elements.forEach((element) => {
          if (element) {
            element.removeEventListener(
              "wheel",
              handleWheel as unknown as EventListener
            );
          }
        });
      };
    }, [highlightedPart, date]);

    const formatWithTz = (date: Date, fmt: string) =>
      formatInTimeZone(date, timeZone, fmt);

    return (
      <>
        <style>
          {`
            .date-part {
              touch-action: none;
            }
          `}
        </style>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger render={<Button
            id="date"
            ref={ref}
            {...props}
            className={cn(
              "w-auto",
              multiSelectVariants({ variant, className })
            )}
            suppressHydrationWarning
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>
              {date?.from ? (
                date.to ? (
                  <>
                    <span
                      id={`firstDay-${id}`}
                      className={cn(
                        "date-part",
                        highlightedPart === "firstDay" &&
                        "underline font-bold"
                      )}
                      onMouseOver={() => handleMouseOver("firstDay")}
                      onMouseLeave={handleMouseLeave}
                    >
                      {formatWithTz(date.from, "dd")}
                    </span>{" "}
                    <span
                      id={`firstMonth-${id}`}
                      className={cn(
                        "date-part",
                        highlightedPart === "firstMonth" &&
                        "underline font-bold"
                      )}
                      onMouseOver={() => handleMouseOver("firstMonth")}
                      onMouseLeave={handleMouseLeave}
                    >
                      {formatWithTz(date.from, "LLL")}
                    </span>
                    ,{" "}
                    <span
                      id={`firstYear-${id}`}
                      className={cn(
                        "date-part",
                        highlightedPart === "firstYear" &&
                        "underline font-bold"
                      )}
                      onMouseOver={() => handleMouseOver("firstYear")}
                      onMouseLeave={handleMouseLeave}
                    >
                      {formatWithTz(date.from, "y")}
                    </span>
                    {numberOfMonths === 2 && (
                      <>
                        {" - "}
                        <span
                          id={`secondDay-${id}`}
                          className={cn(
                            "date-part",
                            highlightedPart === "secondDay" &&
                            "underline font-bold"
                          )}
                          onMouseOver={() => handleMouseOver("secondDay")}
                          onMouseLeave={handleMouseLeave}
                        >
                          {formatWithTz(date.to, "dd")}
                        </span>{" "}
                        <span
                          id={`secondMonth-${id}`}
                          className={cn(
                            "date-part",
                            highlightedPart === "secondMonth" &&
                            "underline font-bold"
                          )}
                          onMouseOver={() => handleMouseOver("secondMonth")}
                          onMouseLeave={handleMouseLeave}
                        >
                          {formatWithTz(date.to, "LLL")}
                        </span>
                        ,{" "}
                        <span
                          id={`secondYear-${id}`}
                          className={cn(
                            "date-part",
                            highlightedPart === "secondYear" &&
                            "underline font-bold"
                          )}
                          onMouseOver={() => handleMouseOver("secondYear")}
                          onMouseLeave={handleMouseLeave}
                        >
                          {formatWithTz(date.to, "y")}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span
                      id="day"
                      className={cn(
                        "date-part",
                        highlightedPart === "day" && "underline font-bold"
                      )}
                      onMouseOver={() => handleMouseOver("day")}
                      onMouseLeave={handleMouseLeave}
                    >
                      {formatWithTz(date.from, "dd")}
                    </span>{" "}
                    <span
                      id="month"
                      className={cn(
                        "date-part",
                        highlightedPart === "month" && "underline font-bold"
                      )}
                      onMouseOver={() => handleMouseOver("month")}
                      onMouseLeave={handleMouseLeave}
                    >
                      {formatWithTz(date.from, "LLL")}
                    </span>
                    ,{" "}
                    <span
                      id="year"
                      className={cn(
                        "date-part",
                        highlightedPart === "year" && "underline font-bold"
                      )}
                      onMouseOver={() => handleMouseOver("year")}
                      onMouseLeave={handleMouseLeave}
                    >
                      {formatWithTz(date.from, "y")}
                    </span>
                  </>
                )
              ) : (
                <span>{placeholder}</span>
              )}
            </span>
          </Button>
          }>
          </PopoverTrigger>
          {isPopoverOpen && (
            <PopoverContent
              className="w-auto"
              align="center"
              style={{
                maxHeight: "var(--available-height)",
                overflowY: "auto",
              }}
            >
              <div className="flex">
                {numberOfMonths === 2 && (
                  <div className="hidden md:flex flex-col gap-1 pr-4 text-left border-r border-foreground/10">
                    {onClear && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "justify-start hover:bg-primary/90 hover:text-background",
                          !date?.from &&
                          "bg-primary text-background hover:bg-primary/90 hover:text-background"
                        )}
                        onClick={() => {
                          onClear();
                          closeOnSelect && setIsPopoverOpen(false);
                        }}
                      >
                        All Time
                      </Button>
                    )}
                    {dateRanges.map(({ label, start, end }) => (
                      <Button
                        key={label}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "justify-start hover:bg-primary/90 hover:text-background",
                          selectedRange === label &&
                          "bg-primary text-background hover:bg-primary/90 hover:text-background"
                        )}
                        onClick={() => selectDateRange(start, end)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex flex-col">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2 ml-3">
                      <Select
                        onValueChange={(value) =>
                          handleMonthChange(months.indexOf(String(value)), "from")
                        }
                        value={
                          monthFrom ? months[monthFrom.getMonth()] : undefined
                        }
                      >
                        <SelectTrigger className="hidden sm:flex w-[122px] focus:ring-0 focus:ring-offset-0 font-medium hover:bg-accent hover:text-accent-foreground">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={idx} value={month}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        onValueChange={(value) =>
                          handleYearChange(Number(value), "from")
                        }
                        value={yearFrom ? yearFrom.toString() : undefined}
                      >
                        <SelectTrigger className="hidden sm:flex w-[122px] focus:ring-0 focus:ring-offset-0 font-medium hover:bg-accent hover:text-accent-foreground">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year, idx) => (
                            <SelectItem key={idx} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {numberOfMonths === 2 && (
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value) =>
                            handleMonthChange(months.indexOf(String(value)), "to")
                          }
                          value={
                            monthTo ? months[monthTo.getMonth()] : undefined
                          }
                        >
                          <SelectTrigger className="hidden sm:flex w-[122px] focus:ring-0 focus:ring-offset-0 font-medium hover:bg-accent hover:text-accent-foreground">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {months.map((month, idx) => (
                              <SelectItem key={idx} value={month}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          onValueChange={(value) =>
                            handleYearChange(Number(value), "to")
                          }
                          value={yearTo ? yearTo.toString() : undefined}
                        >
                          <SelectTrigger className="hidden sm:flex w-[122px] focus:ring-0 focus:ring-offset-0 font-medium hover:bg-accent hover:text-accent-foreground">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((year, idx) => (
                              <SelectItem key={idx} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="flex">
                    <Calendar
                      mode="range"
                      defaultMonth={monthFrom}
                      month={monthFrom}
                      onMonthChange={setMonthFrom}
                      selected={view}
                      onSelect={handleDateSelect}
                      numberOfMonths={numberOfMonths}
                      showOutsideDays={false}
                      className={className}
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          )}
        </Popover>
      </>
    );
  }
);

CalendarDatePicker.displayName = "CalendarDatePicker";
