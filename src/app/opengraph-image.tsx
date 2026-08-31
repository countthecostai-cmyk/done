import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
          color: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 140,
            height: 140,
            borderRadius: 28,
            background: "#ffffff",
            color: "#171717",
            fontSize: 84,
            fontWeight: 700,
          }}
        >
          D
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 64, fontWeight: 700 }}>
          Done
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 32, color: "#a3a3a3" }}>
          There&apos;s a Doer for that
        </div>
      </div>
    ),
    { ...size }
  );
}
