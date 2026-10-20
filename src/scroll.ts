type WheelInput = Pick<
  WheelEvent,
  "deltaX" | "deltaY" | "deltaMode" | "ctrlKey"
>;

export function galleryWheelOffset(event: WheelInput, pageSize: number) {
  if (
    event.ctrlKey ||
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
    !event.deltaY
  )
    return null;
  return (
    event.deltaY *
    (event.deltaMode === 1 ? 28 : event.deltaMode === 2 ? pageSize : 1)
  );
}
