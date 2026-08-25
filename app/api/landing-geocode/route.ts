import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ message: "Location is required." }, { status: 400 });

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("countrycodes", "us");
    url.searchParams.set("addressdetails", "1");
    const response = await fetch(url, {
      headers: { "User-Agent": "FittingIn/1.0 (https://fittingin.co)" },
      next: { revalidate: 300 },
    });
    const results = response.ok ? await response.json() : [];
    const [result] = results;
    const lat = Number(result?.lat), lng = Number(result?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ message: "Location not found." }, { status: 404 });
    return NextResponse.json({
      lat,
      lng,
      label: result.display_name,
      results: results.map((item: { place_id: number; display_name: string; lat: string; lon: string; address?: Record<string, string> }) => ({
        id: String(item.place_id),
        label: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
        city: item.address?.city ?? item.address?.town ?? item.address?.village ?? item.address?.municipality ?? "",
        state: item.address?.state ?? "",
        country: item.address?.country_code?.toUpperCase() ?? item.address?.country ?? "",
      })),
    });
  } catch {
    return NextResponse.json({ message: "Location lookup failed." }, { status: 502 });
  }
}
