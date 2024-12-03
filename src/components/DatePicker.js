import React, { useState } from "react";

const DatePicker = ({
  dateRange,
  setDateRange,
  currentMonth,
  setCurrentMonth,
  setShowDatePicker,
  datePickerRef,
  setDatePickerRef,
}) => {
  const [selecting, setSelecting] = useState(false);

  const formatDateToISO = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateClick = (date) => {
    const clickedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

    const formattedDate = clickedDate.toISOString().split("T")[0];

    if (dateRange.start === formattedDate && dateRange.end === formattedDate) {
      setDateRange({ start: "", end: "" });
      setSelecting(false);
      return;
    }

    if (!selecting) {
      setDateRange({ start: formattedDate, end: formattedDate });
      setSelecting(true);
    } else {
      const startDate = new Date(dateRange.start);
      if (clickedDate < startDate) {
        setDateRange({ start: formattedDate, end: dateRange.start });
      } else {
        setDateRange({ start: dateRange.start, end: formattedDate });
      }
      setSelecting(false);
    }
  };

  const isDateInRange = (date) => {
    if (!dateRange.start || !dateRange.end) return false;

    const currentDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      .toISOString()
      .split("T")[0];

    return currentDate >= dateRange.start && currentDate <= dateRange.end;
  };

  const getCalendarDays = (month) => {
    const year = month.getFullYear();
    const m = month.getMonth();

    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);

    const days = [];
    const dayOfWeek = firstDay.getDay(); // Domingo es 0

    // Agregar días vacíos antes del primer día del mes
    for (let i = 0; i < dayOfWeek; i++) {
      days.push(null);
    }

    // Agregar los días del mes
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, m, i));
    }

    return days;
  };

  const renderDay = (date) => {
    if (!date) return <div key={`empty-${Math.random()}`} />;

    const isSelected = isDateInRange(date);
    const formattedDate = formatDateToISO(date);
    const isStart = formattedDate === dateRange.start;
    const isEnd = formattedDate === dateRange.end;

    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    return (
      <button
        key={formattedDate}
        onClick={() => handleDateClick(date)}
        className={`w-10 h-10 rounded-full flex items-center justify-center
          ${isSelected ? "bg-primary-100 text-primary-600" : "hover:bg-gray-100"}
          ${isStart || isEnd ? "bg-primary-600 text-white hover:bg-primary-700" : ""}
          ${isToday ? "border border-primary-600" : ""}
          ${!isSelected && !isStart && !isEnd ? "text-gray-900" : ""}
        `}
      >
        {date.getDate()}
      </button>
    );
  };

  const months = [
    currentMonth,
    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
  ];

  return (
    <div
      ref={setDatePickerRef}
      className="absolute mt-2 bg-white rounded-lg shadow-lg p-6 border z-10 min-w-[700px]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => {
            setCurrentMonth((prev) => {
              const previous = new Date(prev);
              previous.setMonth(previous.getMonth() - 1);
              return previous;
            });
          }}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          ←
        </button>
        <div className="flex gap-4">
          {months.map((month) => (
            <span key={month.toString()} className="text-lg font-semibold">
              {month.toLocaleString("es-MX", { month: "long", year: "numeric" })}
            </span>
          ))}
        </div>
        <button
          onClick={() => {
            setCurrentMonth((prev) => {
              const next = new Date(prev);
              next.setMonth(next.getMonth() + 1);
              return next;
            });
          }}
          className="p-1 hover:bg-gray-100 rounded-full"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-2 gap-8">
        {months.map((month) => (
          <div key={month.toString()}>
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"].map((day) => (
                <div key={day} className="text-xs font-medium text-gray-500 mb-2">
                  {day}
                </div>
              ))}
              {getCalendarDays(month).map((date, index) => (
                <React.Fragment key={date ? date.toString() : `empty-${index}`}>
                  {renderDay(date)}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DatePicker;