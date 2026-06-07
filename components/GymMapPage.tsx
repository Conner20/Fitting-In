'use client';

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Link as LinkIcon, MapPin, MessageSquare, Navigation, Share2, Star, X } from "lucide-react";
import { createPortal } from "react-dom";

import MobileHeader from "@/components/MobileHeader";

type GymMapItem = {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
    gymProfile: {
        id: string;
        name: string;
        address: string;
        city: string | null;
        state: string | null;
        country: string | null;
        lat: number;
        lng: number;
        fee: number;
        rating: number | null;
        clients: number;
        hiringTrainers: boolean;
        website: string;
        showWebsiteButton: boolean;
        bio: string | null;
        isVerified: boolean;
        amenities: string[];
    };
    about: string | null;
    gallery: string[];
};

type Coordinates = {
    lat: number;
    lng: number;
};

declare global {
    interface Window {
        google?: any;
        __googleMapsLoaderPromise?: Promise<any>;
    }
}

function loadGoogleMaps(apiKey: string) {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("Google Maps can only load in the browser."));
    }

    if (window.google?.maps) {
        return Promise.resolve(window.google);
    }

    if (window.__googleMapsLoaderPromise) {
        return window.__googleMapsLoaderPromise;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps-loader="true"]');
    if (existing) {
        if (existing.dataset.loaded === "true" && window.google?.maps) {
            return Promise.resolve(window.google);
        }

        if (existing.dataset.loaded === "error") {
            return Promise.reject(new Error("Failed to load Google Maps."));
        }

        window.__googleMapsLoaderPromise = new Promise<any>((resolve, reject) => {
            const timeout = window.setTimeout(() => {
                reject(new Error("Google Maps took too long to initialize."));
            }, 12000);

            let settled = false;
            const finishResolve = () => {
                if (settled || !window.google?.maps) return;
                settled = true;
                existing.dataset.loaded = "true";
                window.clearTimeout(timeout);
                resolve(window.google);
            };
            const finishReject = (message: string) => {
                if (settled) return;
                settled = true;
                existing.dataset.loaded = "error";
                window.clearTimeout(timeout);
                reject(new Error(message));
            };

            const handleLoad = () => {
                finishResolve();
            };

            const waitStart = Date.now();
            const poll = window.setInterval(() => {
                if (window.google?.maps) {
                    window.clearInterval(poll);
                    finishResolve();
                } else if (Date.now() - waitStart > 4000) {
                    window.clearInterval(poll);
                    finishReject("Google Maps failed to initialize.");
                }
            }, 100);

            existing.addEventListener("load", handleLoad, { once: true });
            existing.addEventListener(
                "error",
                () => {
                    window.clearInterval(poll);
                    finishReject("Failed to load Google Maps.");
                },
                { once: true }
            );
        }).finally(() => {
            window.__googleMapsLoaderPromise = undefined;
        });

        return window.__googleMapsLoaderPromise;
    }

    window.__googleMapsLoaderPromise = new Promise<any>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
        script.async = true;
        script.defer = true;
        script.dataset.googleMapsLoader = "true";
        const timeout = window.setTimeout(() => {
            script.dataset.loaded = "error";
            reject(new Error("Google Maps took too long to initialize."));
        }, 12000);
        script.onload = () => {
            if (window.google?.maps) {
                script.dataset.loaded = "true";
                window.clearTimeout(timeout);
                resolve(window.google);
                return;
            }

            const waitStart = Date.now();
            const poll = window.setInterval(() => {
                if (window.google?.maps) {
                    window.clearInterval(poll);
                    script.dataset.loaded = "true";
                    window.clearTimeout(timeout);
                    resolve(window.google);
                } else if (Date.now() - waitStart > 4000) {
                    window.clearInterval(poll);
                    window.clearTimeout(timeout);
                    reject(new Error("Google Maps failed to initialize."));
                }
            }, 100);
        };
        script.onerror = () => {
            script.dataset.loaded = "error";
            window.clearTimeout(timeout);
            reject(new Error("Failed to load Google Maps."));
        };
        document.head.appendChild(script);
    }).finally(() => {
        window.__googleMapsLoaderPromise = undefined;
    });

    return window.__googleMapsLoaderPromise;
}

function getDistanceMiles(from: Coordinates, to: Coordinates) {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusMiles = 3958.8;
    const dLat = toRadians(to.lat - from.lat);
    const dLng = toRadians(to.lng - from.lng);
    const lat1 = toRadians(from.lat);
    const lat2 = toRadians(to.lat);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistanceMiles(distanceMiles: number) {
    if (distanceMiles < 10) return `${distanceMiles.toFixed(1)} mi`;
    return `${Math.round(distanceMiles)} mi`;
}

function formatMoney(value: number) {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

const DESKTOP_MAP_PERCENT = 54;

export function GymDiscoveryPanel({
    googleMapsApiKey,
    embedded = false,
    hideList = false,
    hideListHeader = false,
    selectedGymIdOverride = null,
    clearSelectionSignal = 0,
    onViewAllGyms,
    autoSelectFirst = true,
    showBackToMap = false,
    query = "",
    hiringOnly = false,
    sortBy = "DISTANCE",
    minBudget = null,
    maxBudget = null,
}: {
    googleMapsApiKey?: string | null;
    embedded?: boolean;
    hideList?: boolean;
    hideListHeader?: boolean;
    selectedGymIdOverride?: string | null;
    clearSelectionSignal?: number;
    onViewAllGyms?: (() => void) | undefined;
    autoSelectFirst?: boolean;
    showBackToMap?: boolean;
    query?: string;
    hiringOnly?: boolean;
    sortBy?: "DISTANCE" | "RATING";
    minBudget?: number | null;
    maxBudget?: number | null;
}) {
    const router = useRouter();
    const mapRef = useRef<HTMLDivElement | null>(null);
    const infoPanelRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<Array<{ id: string; marker: any }>>([]);
    const locationMarkerRef = useRef<any>(null);
    const [gyms, setGyms] = useState<GymMapItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [mapError, setMapError] = useState<string | null>(null);
    const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [resolvedApiKey, setResolvedApiKey] = useState<string | null>(googleMapsApiKey ?? null);
    const [apiKeyResolved, setApiKeyResolved] = useState(googleMapsApiKey !== undefined);
    const [mapRefitNonce, setMapRefitNonce] = useState(0);
    const [browserLocationResolved, setBrowserLocationResolved] = useState(false);
    const [hideViewAllGymsButton, setHideViewAllGymsButton] = useState(false);
    const previousSelectedGymIdOverrideRef = useRef<string | null>(selectedGymIdOverride);
    const previousHasSelectedGymRef = useRef<boolean>(false);
    const previousClearSelectionSignalRef = useRef(clearSelectionSignal);
    const userMapInteractionArmedRef = useRef(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        setResolvedApiKey(googleMapsApiKey ?? null);
        setApiKeyResolved(googleMapsApiKey !== undefined);
    }, [googleMapsApiKey]);

    useEffect(() => {
        if (googleMapsApiKey !== undefined) return;

        let cancelled = false;
        const fetchConfig = async () => {
            try {
                const res = await fetch("/api/map/config", { cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(data?.message || "Failed to load map configuration.");
                }
                if (!cancelled) {
                    setResolvedApiKey(data?.googleMapsApiKey ?? null);
                    setApiKeyResolved(true);
                    setMapError(null);
                }
            } catch (error) {
                if (!cancelled) {
                    setApiKeyResolved(true);
                    setMapError(error instanceof Error ? error.message : "Failed to load map configuration.");
                }
            }
        };

        void fetchConfig();
        return () => {
            cancelled = true;
        };
    }, [googleMapsApiKey]);

    const normalizedQuery = query.trim().toLowerCase();
    const filteredGyms = useMemo(() => {
        return gyms.filter((gym) => {
            const matchesQuery =
                !normalizedQuery ||
                gym.gymProfile.name.toLowerCase().includes(normalizedQuery) ||
                gym.gymProfile.address.toLowerCase().includes(normalizedQuery) ||
                (gym.name || "").toLowerCase().includes(normalizedQuery) ||
                (gym.about || "").toLowerCase().includes(normalizedQuery);

            const fee = gym.gymProfile.fee;
            const matchesMin = minBudget == null || fee >= minBudget;
            const matchesMax = maxBudget == null || fee <= maxBudget;
            const matchesHiring = !hiringOnly || gym.gymProfile.hiringTrainers;

            return matchesQuery && matchesMin && matchesMax && matchesHiring;
        });
    }, [gyms, hiringOnly, maxBudget, minBudget, normalizedQuery]);

    const gymsByDistance = useMemo(() => {
        const sorted = [...filteredGyms];
        const budgetActive = minBudget != null || maxBudget != null;

        if (sortBy === "RATING") {
            sorted.sort((a, b) => {
                if (a.gymProfile.rating != null && b.gymProfile.rating != null && a.gymProfile.rating !== b.gymProfile.rating) {
                    return b.gymProfile.rating - a.gymProfile.rating;
                }
                if (a.gymProfile.rating != null && b.gymProfile.rating == null) return -1;
                if (a.gymProfile.rating == null && b.gymProfile.rating != null) return 1;
                if (userLocation) {
                    const aDistance = getDistanceMiles(userLocation, {
                        lat: a.gymProfile.lat,
                        lng: a.gymProfile.lng,
                    });
                    const bDistance = getDistanceMiles(userLocation, {
                        lat: b.gymProfile.lat,
                        lng: b.gymProfile.lng,
                    });
                    if (aDistance !== bDistance) return aDistance - bDistance;
                }
                return a.gymProfile.name.localeCompare(b.gymProfile.name);
            });
            return sorted.map((gym) => ({
                gym,
                distanceMiles: userLocation
                    ? getDistanceMiles(userLocation, {
                        lat: gym.gymProfile.lat,
                        lng: gym.gymProfile.lng,
                    })
                    : null as number | null,
            }));
        }

        if (budgetActive) {
            sorted.sort((a, b) => {
                if (a.gymProfile.fee !== b.gymProfile.fee) return a.gymProfile.fee - b.gymProfile.fee;
                return a.gymProfile.name.localeCompare(b.gymProfile.name);
            });
            return sorted.map((gym) => ({
                gym,
                distanceMiles: userLocation
                    ? getDistanceMiles(userLocation, {
                        lat: gym.gymProfile.lat,
                        lng: gym.gymProfile.lng,
                    })
                    : null as number | null,
            }));
        }

        if (!userLocation) {
            return filteredGyms.map((gym) => ({ gym, distanceMiles: null as number | null }));
        }

        return filteredGyms
            .map((gym) => ({
                gym,
                distanceMiles: getDistanceMiles(userLocation, {
                    lat: gym.gymProfile.lat,
                    lng: gym.gymProfile.lng,
                }),
            }))
            .sort((a, b) => (a.distanceMiles ?? Number.POSITIVE_INFINITY) - (b.distanceMiles ?? Number.POSITIVE_INFINITY));
    }, [filteredGyms, userLocation]);

    const selectedGym = useMemo(
        () => gymsByDistance.find(({ gym }) => gym.id === selectedGymId)?.gym ?? null,
        [gymsByDistance, selectedGymId]
    );

    const selectedGymDistance = useMemo(
        () => gymsByDistance.find(({ gym }) => gym.id === selectedGym?.id)?.distanceMiles ?? null,
        [gymsByDistance, selectedGym]
    );
    const selectedGymAmenities = useMemo(
        () => (selectedGym?.gymProfile.amenities ?? []).map((item) => item.trim()).filter(Boolean),
        [selectedGym]
    );
    const selectedGymLocationSummary = useMemo(
        () =>
            [selectedGym?.gymProfile.city, selectedGym?.gymProfile.state, selectedGym?.gymProfile.country]
                .filter(Boolean)
                .join(", "),
        [selectedGym]
    );
    const showStreetAddress = useMemo(() => {
        const address = selectedGym?.gymProfile.address?.trim() ?? "";
        const locationSummary = selectedGymLocationSummary.trim();
        if (!address) return false;
        if (!locationSummary) return true;
        return address.toLowerCase() !== locationSummary.toLowerCase();
    }, [selectedGym, selectedGymLocationSummary]);
    const streetAddressLine = useMemo(() => {
        return showStreetAddress ? selectedGym?.gymProfile.address?.trim() ?? "" : "";
    }, [selectedGym, showStreetAddress]);
    const cityLocationLine = useMemo(() => {
        return selectedGymLocationSummary.trim();
    }, [selectedGymLocationSummary]);
    const allowReturnToMap = showBackToMap && !selectedGymIdOverride && !autoSelectFirst;
    const showViewAllGymsButton = showBackToMap && filteredGyms.length > 1 && !hideViewAllGymsButton;
    const hasSelectedGymTarget = Boolean(selectedGymIdOverride || selectedGymId);

    const handleViewAllGyms = () => {
        userMapInteractionArmedRef.current = false;
        setHideViewAllGymsButton(true);
        if (onViewAllGyms) {
            onViewAllGyms();
            if (!selectedGym && !selectedGymIdOverride) {
                setMapRefitNonce((current) => current + 1);
            }
            return;
        }
        if (!selectedGym && !selectedGymIdOverride) {
            setMapRefitNonce((current) => current + 1);
        }
        setSelectedGymId(null);
    };

    useEffect(() => {
        if (selectedGym) {
            setHideViewAllGymsButton(false);
        }
    }, [selectedGym]);

    useEffect(() => {
        if (showBackToMap && !selectedGym && !selectedGymIdOverride) {
            setHideViewAllGymsButton(true);
        }
    }, [selectedGym, selectedGymIdOverride, showBackToMap]);

    useEffect(() => {
        const previousSelectedGymIdOverride = previousSelectedGymIdOverrideRef.current;

        if (selectedGymIdOverride) {
            setSelectedGymId(selectedGymIdOverride);
        } else if (previousSelectedGymIdOverride) {
            setSelectedGymId(null);
        }

        previousSelectedGymIdOverrideRef.current = selectedGymIdOverride;
    }, [selectedGymIdOverride]);

    useEffect(() => {
        if (selectedGymIdOverride) {
            previousClearSelectionSignalRef.current = clearSelectionSignal;
            return;
        }

        if (previousClearSelectionSignalRef.current !== clearSelectionSignal) {
            setSelectedGymId(null);
        }

        previousClearSelectionSignalRef.current = clearSelectionSignal;
    }, [clearSelectionSignal, selectedGymIdOverride]);

    useEffect(() => {
        let alive = true;

        const fetchGyms = async () => {
            setLoading(true);
            setMapError(null);
            try {
                const res = await fetch("/api/map/gyms", { cache: "no-store" });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(data?.message || "Failed to load gyms.");
                }
                if (!alive) return;
                const nextGyms: GymMapItem[] = Array.isArray(data?.gyms) ? data.gyms : [];
                setGyms(nextGyms);
                if (!browserLocationResolved && data?.viewerCoords?.lat != null && data?.viewerCoords?.lng != null) {
                    setUserLocation({
                        lat: data.viewerCoords.lat,
                        lng: data.viewerCoords.lng,
                    });
                }
                if (selectedGymIdOverride) {
                    setSelectedGymId(selectedGymIdOverride);
                } else if (autoSelectFirst) {
                    setSelectedGymId(nextGyms[0]?.id ?? null);
                } else {
                    setSelectedGymId(null);
                }
            } catch (error) {
                if (!alive) return;
                setMapError(error instanceof Error ? error.message : "Failed to load gyms.");
            } finally {
                if (alive) setLoading(false);
            }
        };

        void fetchGyms();

        return () => {
            alive = false;
        };
    }, [autoSelectFirst]);

    useEffect(() => {
        if (typeof window === "undefined" || !("geolocation" in navigator)) return;

        let cancelled = false;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                if (cancelled) return;
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setBrowserLocationResolved(true);
            },
            () => {
                if (cancelled) return;
                setBrowserLocationResolved(true);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 5 * 60 * 1000,
            }
        );

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (autoSelectFirst && !selectedGymId && gymsByDistance.length > 0) {
            setSelectedGymId(gymsByDistance[0].gym.id);
        }
    }, [autoSelectFirst, gymsByDistance, selectedGymId]);

    useEffect(() => {
        if (!apiKeyResolved) return;
        if (!resolvedApiKey) {
            setMapError("GOOGLE_PLACES_API_KEY is not configured.");
            setMapReady(false);
            return;
        }
        if (!mapRef.current) return;
        if (gymsByDistance.length === 0) {
            setMapReady(true);
            return;
        }
        setMapReady(false);

        let cancelled = false;

        const initMap = async () => {
            try {
                setMapError(null);
                const googleApi = await loadGoogleMaps(resolvedApiKey);
                if (cancelled || !mapRef.current) return;

                const gymsToDisplayOnMap = gymsByDistance.map(({ gym }) => gym);

                const center = selectedGym
                    ? { lat: selectedGym.gymProfile.lat, lng: selectedGym.gymProfile.lng }
                    : { lat: gymsToDisplayOnMap[0]!.gymProfile.lat, lng: gymsToDisplayOnMap[0]!.gymProfile.lng };

                const map = new googleApi.maps.Map(mapRef.current, {
                    center,
                    zoom: gymsToDisplayOnMap.length === 1 ? 13 : 10,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    clickableIcons: false,
                    styles: [
                        { featureType: "poi.business", stylers: [{ visibility: "off" }] },
                    ],
                });
                mapInstanceRef.current = map;

                const mapElement = mapRef.current;
                const armInteraction = () => {
                    userMapInteractionArmedRef.current = true;
                };

                mapElement?.addEventListener("pointerdown", armInteraction);
                mapElement?.addEventListener("touchstart", armInteraction, { passive: true });
                mapElement?.addEventListener("wheel", armInteraction, { passive: true });

                const gymBounds = new googleApi.maps.LatLngBounds();

                markersRef.current = gymsToDisplayOnMap.map((gym) => {
                    const position = { lat: gym.gymProfile.lat, lng: gym.gymProfile.lng };
                    const shouldShowMarker = !selectedGym || gym.id === selectedGym.id;
                    const marker = new googleApi.maps.Marker({
                        position,
                        map: shouldShowMarker ? map : null,
                        title: gym.gymProfile.name,
                        animation: googleApi.maps.Animation.DROP,
                    });

                    gymBounds.extend(position);

                    marker.addListener("click", () => {
                        setSelectedGymId(gym.id);
                    });

                    return { id: gym.id, marker };
                });

                const dragListener = map.addListener("dragend", () => {
                    if (!userMapInteractionArmedRef.current) return;
                    userMapInteractionArmedRef.current = false;
                    setHideViewAllGymsButton(false);
                });

                const zoomListener = map.addListener("zoom_changed", () => {
                    if (!userMapInteractionArmedRef.current) return;
                    userMapInteractionArmedRef.current = false;
                    setHideViewAllGymsButton(false);
                });

                if (userLocation) {
                    locationMarkerRef.current = new googleApi.maps.Marker({
                        position: userLocation,
                        map,
                        title: "Your location",
                        icon: {
                            path: googleApi.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: "#15803d",
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 2,
                        },
                        zIndex: 999,
                    });
                }

                if (gymsToDisplayOnMap.length > 1 || userLocation) {
                    if (userLocation) {
                        gymBounds.extend(userLocation);
                    }
                    map.fitBounds(gymBounds, 40);
                }

                setMapReady(true);

                return () => {
                    mapElement?.removeEventListener("pointerdown", armInteraction);
                    mapElement?.removeEventListener("touchstart", armInteraction);
                    mapElement?.removeEventListener("wheel", armInteraction);
                    googleApi.maps.event.removeListener(dragListener);
                    googleApi.maps.event.removeListener(zoomListener);
                };
            } catch (error) {
                if (cancelled) return;
                setMapError(error instanceof Error ? error.message : "Failed to initialize map.");
            }
        };

        let cleanupMapListeners: (() => void) | undefined;

        void initMap().then((cleanup) => {
            cleanupMapListeners = cleanup;
        });

        return () => {
            cancelled = true;
            cleanupMapListeners?.();
            markersRef.current.forEach(({ marker }) => {
                if (marker?.setMap) marker.setMap(null);
            });
            markersRef.current = [];
            if (locationMarkerRef.current?.setMap) {
                locationMarkerRef.current.setMap(null);
            }
            locationMarkerRef.current = null;
            mapInstanceRef.current = null;
        };
    }, [apiKeyResolved, gymsByDistance, resolvedApiKey, userLocation]);

    useEffect(() => {
        const map = mapInstanceRef.current;
        const googleApi = typeof window !== "undefined" ? window.google : undefined;
        if (!map || !googleApi?.maps || gymsByDistance.length === 0) return;

        const fitBoundsWithMaxZoom = (bounds: any, padding: number, maxZoom: number) => {
            const previousMaxZoom = typeof map.get("maxZoom") === "number" ? map.get("maxZoom") : null;
            map.setOptions({ maxZoom });
            map.fitBounds(bounds, padding);
            googleApi.maps.event.addListenerOnce(map, "idle", () => {
                map.setOptions({ maxZoom: previousMaxZoom });
            });
        };

        const fitAllGyms = () => {
            const bounds = new googleApi.maps.LatLngBounds();
            gymsByDistance.forEach(({ gym }) => {
                bounds.extend({ lat: gym.gymProfile.lat, lng: gym.gymProfile.lng });
            });
            if (userLocation) {
                bounds.extend(userLocation);
            }
            if (gymsByDistance.length > 1 || userLocation) {
                map.fitBounds(bounds, 40);
                return;
            }
            map.panTo({
                lat: gymsByDistance[0]!.gym.gymProfile.lat,
                lng: gymsByDistance[0]!.gym.gymProfile.lng,
            });
            map.setZoom(13);
        };

        const applyViewport = () => {
            if (!selectedGym) {
                fitAllGyms();
                return;
            }

            if (userLocation) {
                const bounds = new googleApi.maps.LatLngBounds();
                bounds.extend(userLocation);
                bounds.extend({
                    lat: selectedGym.gymProfile.lat,
                    lng: selectedGym.gymProfile.lng,
                });
                fitBoundsWithMaxZoom(bounds, 48, 13);
                return;
            }

            map.panTo({
                lat: selectedGym.gymProfile.lat,
                lng: selectedGym.gymProfile.lng,
            });
            map.setZoom(13);
        };

        const hasSelectedGym = Boolean(selectedGym);
        const modeChanged = previousHasSelectedGymRef.current !== hasSelectedGym;
        previousHasSelectedGymRef.current = hasSelectedGym;

        if (!modeChanged) {
            applyViewport();
            return;
        }

        const resizeTimeout = window.setTimeout(() => {
            if (mapInstanceRef.current !== map) return;
            googleApi.maps.event.trigger(map, "resize");
            applyViewport();
        }, 320);

        return () => {
            window.clearTimeout(resizeTimeout);
        };
    }, [gymsByDistance, mapRefitNonce, selectedGym, userLocation]);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        markersRef.current.forEach(({ id, marker }) => {
            if (!marker?.setMap) return;
            if (!selectedGym || id === selectedGym.id) {
                marker.setMap(map);
            } else {
                marker.setMap(null);
            }
        });
    }, [selectedGym]);

    useEffect(() => {
        if (!selectedGymId) return;
        if (infoPanelRef.current) {
            infoPanelRef.current.scrollTop = 0;
        }
    }, [selectedGymId]);

    const popupProfileHref = selectedGym?.username
        ? `/u/${encodeURIComponent(selectedGym.username)}`
        : "/search";
    const handleMessage = (gym: GymMapItem) => {
        const to = gym.username || gym.id;
        router.push(`/messages?to=${encodeURIComponent(to)}`);
    };

    const handleShareProfile = (gym: GymMapItem) => {
        const pretty = gym.username || gym.id;
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const profileUrl = `${origin}/u/${pretty}`;
        const shareLabel = gym.name || gym.username || gym.gymProfile.name || "Gym";
        router.push(
            `/messages?shareType=profile&shareUrl=${encodeURIComponent(profileUrl)}&shareLabel=${encodeURIComponent(shareLabel)}&shareUserId=${encodeURIComponent(gym.id)}`
        );
    };

    return (
        <div className={embedded ? "w-full" : "flex min-h-screen flex-col bg-[#f8f8f8] text-black dark:bg-[#050505] dark:text-white"}>
            {!embedded && <MobileHeader title="map" href="/map" />}

            {!embedded && (
                <header className="hidden border-b border-black/5 bg-white px-6 py-5 lg:block dark:border-white/10 dark:bg-neutral-900">
                    <div className="mx-auto flex max-w-7xl items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-green-700 dark:text-green-400">gym discovery</h1>
                        </div>
                    </div>
                </header>
            )}

            <main className={embedded ? "flex w-full flex-col gap-4 lg:flex-row lg:gap-6" : "mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-4 lg:flex-row lg:gap-6"}>
                {!hideList && (
                <aside className="order-2 rounded-xl border border-black/5 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 lg:order-1 lg:h-[calc(100vh-190px)] lg:w-[380px] lg:shrink-0 lg:overflow-y-auto">
                    {!hideListHeader && (
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-gray-400">
                                gyms nearby
                            </h2>
                            <span className="text-xs text-zinc-400 dark:text-gray-500">
                                {filteredGyms.length}
                            </span>
                        </div>
                    )}

                    {loading ? (
                        <div className={`${hideListHeader ? "mt-0" : "mt-6"} flex items-center gap-2 text-sm text-zinc-500 dark:text-gray-400`}>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent dark:border-white dark:border-t-transparent" />
                            Loading gyms…
                        </div>
                    ) : filteredGyms.length === 0 ? (
                        <div className={`${hideListHeader ? "mt-0" : "mt-6"} text-sm text-zinc-500 dark:text-gray-400`}>
                            No gyms match the current search filters.
                        </div>
                    ) : (
                        <div className={`${hideListHeader ? "mt-0" : "mt-4"} space-y-2`}>
                            {gymsByDistance.map(({ gym, distanceMiles }) => {
                                const active = selectedGymId === gym.id;
                                return (
                                    <button
                                        key={gym.id}
                                        type="button"
                                        onClick={() => setSelectedGymId(gym.id)}
                                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                            active
                                                ? "border-green-700 bg-green-50 dark:border-green-400 dark:bg-green-500/10"
                                                : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/30"
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-start gap-3">
                                                {gym.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={gym.image}
                                                        alt={gym.gymProfile.name}
                                                        className="h-11 w-11 shrink-0 rounded-full border border-zinc-200 object-cover dark:border-white/15"
                                                    />
                                                ) : (
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-700 dark:border-white/15 dark:bg-white/10 dark:text-white">
                                                        {gym.gymProfile.name.slice(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate font-semibold text-zinc-900 dark:text-white">
                                                            {gym.gymProfile.name}
                                                        </span>
                                                        {gym.gymProfile.isVerified && (
                                                            <CheckCircle2 size={15} className="shrink-0 text-green-700 dark:text-green-400" />
                                                        )}
                                                    </div>
                                                    <div className="mt-1 text-xs capitalize text-zinc-500 dark:text-gray-400">
                                                        gym
                                                    </div>
                                                    {(gym.gymProfile.city || gym.gymProfile.state) && (
                                                        <div className="mt-1 text-sm text-zinc-600 dark:text-gray-300">
                                                            {gym.gymProfile.city}
                                                            {gym.gymProfile.state ? `, ${gym.gymProfile.state}` : ''}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                {distanceMiles != null && (
                                                    <div className="text-xs text-zinc-500 dark:text-gray-400">
                                                        {formatDistanceMiles(distanceMiles)}
                                                    </div>
                                                )}
                                                {gym.gymProfile.rating != null && (
                                                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-gray-400">
                                                        <Star size={14} className="text-green-700 dark:text-green-400" />
                                                        {gym.gymProfile.rating.toFixed(1)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </aside>
                )}

                <section
                    className={clsx(
                        "scrollbar-hidden order-1 flex min-h-[420px] flex-col rounded-xl border border-black/5 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900 lg:order-2 lg:h-[calc(100vh-190px)] lg:min-w-0 lg:flex-1 lg:overflow-y-auto",
                        selectedGym ? "" : "overflow-hidden"
                    )}
                >
                    <div
                        className="relative flex-1 overflow-hidden transition-[height] duration-500 ease-in-out lg:flex-none"
                        style={{ height: selectedGym ? `${DESKTOP_MAP_PERCENT}%` : '100%' }}
                    >
                        <div ref={mapRef} className="h-[54vh] w-full rounded-t-xl lg:h-full lg:rounded-none lg:rounded-t-xl" />

                        {showViewAllGymsButton && (
                            <div className="absolute left-4 top-4 z-[1]">
                                <button
                                    type="button"
                                    onClick={handleViewAllGyms}
                                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200/80 bg-white/90 px-3 py-2 text-sm text-zinc-700 shadow-sm backdrop-blur-sm transition hover:bg-zinc-100 dark:border-white/10 dark:bg-neutral-900/85 dark:text-gray-100 dark:hover:bg-neutral-800"
                                >
                                    View All Gyms
                                </button>
                            </div>
                        )}

                        {!mapReady && !mapError && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-t-xl bg-white/85 backdrop-blur-sm dark:bg-neutral-900/85">
                                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-gray-400">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent dark:border-white dark:border-t-transparent" />
                                    Initializing map…
                                </div>
                            </div>
                        )}

                        {mapError && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-t-xl bg-white/90 px-6 text-center dark:bg-neutral-900/90">
                                <div className="max-w-sm">
                                    <div className="text-sm font-medium text-zinc-900 dark:text-white">Map unavailable</div>
                                    <div className="mt-2 text-sm text-zinc-500 dark:text-gray-400">{mapError}</div>
                                </div>
                            </div>
                        )}

                        {mapReady && !mapError && filteredGyms.length === 0 && !hasSelectedGymTarget && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-t-xl bg-white/85 px-6 text-center backdrop-blur-sm dark:bg-neutral-900/85">
                                <div className="max-w-sm">
                                    <div className="text-sm font-medium text-zinc-900 dark:text-white">No gyms to display</div>
                                    <div className="mt-2 text-sm text-zinc-500 dark:text-gray-400">
                                        No gyms match the current search filters.
                                    </div>
                                </div>
                            </div>
                        )}

                        {mapReady && !mapError && filteredGyms.length === 0 && hasSelectedGymTarget && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-t-xl bg-white/85 backdrop-blur-sm dark:bg-neutral-900/85">
                                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-gray-400">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent dark:border-white dark:border-t-transparent" />
                                    Loading…
                                </div>
                            </div>
                        )}
                    </div>

                    <div
                        ref={infoPanelRef}
                        className={clsx(
                            "shrink-0 overflow-hidden bg-white transition-[max-height,opacity,border-color] duration-500 ease-in-out dark:bg-neutral-900",
                            selectedGym
                                ? "max-h-[2000px] border-t border-black/5 opacity-100 dark:border-white/10"
                                : "max-h-0 border-t border-transparent opacity-0 dark:border-transparent"
                        )}
                    >
                        {selectedGym && (
                            <div key={selectedGym.id} className="p-4 transition-opacity duration-300 ease-out">
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-black/20">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-3">
                                        {selectedGym.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={selectedGym.image}
                                                alt=""
                                                className="h-14 w-14 shrink-0 rounded-full border border-zinc-200 object-cover dark:border-white/20"
                                            />
                                        ) : (
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-700 dark:border-white/20 dark:bg-white/10 dark:text-white">
                                                {(selectedGym.gymProfile.name || selectedGym.username || 'G').slice(0, 2).toUpperCase()}
                                            </div>
                                        )}

                                        <div className="min-w-0 space-y-0">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={popupProfileHref}
                                                    className="block break-words text-lg font-semibold text-zinc-900 transition hover:underline sm:truncate dark:text-white"
                                                >
                                                    {selectedGym.gymProfile.name}
                                                </Link>
                                                {selectedGym.gymProfile.isVerified && (
                                                    <CheckCircle2 size={16} className="shrink-0 text-green-700 dark:text-green-400" />
                                                )}
                                            </div>
                                            <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 dark:bg-white/10 dark:text-gray-400">
                                                gym
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex w-full shrink-0 items-start gap-2 sm:w-auto">
                                        <div className="flex w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleMessage(selectedGym)}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-0 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2"
                                                title="Message"
                                            >
                                                <MessageSquare size={16} />
                                                <span className="hidden sm:inline">Message</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleShareProfile(selectedGym)}
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-0 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2"
                                                title="Share"
                                            >
                                                <Share2 size={16} />
                                                <span className="hidden sm:inline">Share</span>
                                            </button>
                                            <Link
                                                href={`/u/${encodeURIComponent(selectedGym.username || selectedGym.id)}?rate=1`}
                                                className="inline-flex h-9 w-9 cursor-default items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-0 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2"
                                                title="Rate"
                                            >
                                                <Star size={16} />
                                                <span className="hidden sm:inline">Rate</span>
                                            </Link>
                                            {selectedGym.gymProfile.showWebsiteButton && selectedGym.gymProfile.website.trim() && (
                                                <a
                                                    href={selectedGym.gymProfile.website}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-50/80 p-0 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2"
                                                    title="Visit website"
                                                >
                                                    <LinkIcon size={16} />
                                                    <span className="hidden sm:inline">Website</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {(streetAddressLine || cityLocationLine || selectedGymDistance != null) && (
                                    <div className="mt-3 flex flex-nowrap items-start gap-2">
                                        {showStreetAddress
                                            ? <MapPin size={15} className="mt-0.5 shrink-0 text-zinc-400 dark:text-gray-500" />
                                            : <Navigation size={15} className="mt-0.5 shrink-0 text-zinc-400 dark:text-gray-500" />}
                                        <div className="min-w-0 flex flex-col gap-1">
                                            {streetAddressLine && (
                                                <div className="min-w-0 break-words text-sm text-zinc-600 dark:text-gray-300">
                                                    {streetAddressLine}
                                                </div>
                                            )}
                                            {cityLocationLine && (
                                                <div className="min-w-0 break-words text-sm text-zinc-600 dark:text-gray-300">
                                                    {cityLocationLine}
                                                </div>
                                            )}
                                            {selectedGymDistance != null && (
                                                <div className="text-xs text-zinc-500 dark:text-gray-400">
                                                    {formatDistanceMiles(selectedGymDistance)} away
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-4 grid gap-3 pt-1 sm:grid-cols-3">
                                    <div className="rounded-xl bg-zinc-50/60 px-3 py-3 dark:bg-white/[0.04]">
                                        <div className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-gray-500">Monthly fee</div>
                                        <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
                                            ${formatMoney(selectedGym.gymProfile.fee)}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-zinc-50/60 px-3 py-3 dark:bg-white/[0.04]">
                                        <div className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-gray-500">Rating</div>
                                        <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
                                            {selectedGym.gymProfile.rating != null ? selectedGym.gymProfile.rating.toFixed(1) : "—"}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-zinc-50/60 px-3 py-3 dark:bg-white/[0.04]">
                                        <div className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-gray-500">Members</div>
                                        <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
                                            {selectedGym.gymProfile.clients ?? 0}
                                        </div>
                                    </div>
                                </div>

                                {selectedGym.gymProfile.hiringTrainers && (
                                    <div className="mt-5 border-t border-zinc-200/80 pt-4 dark:border-white/10">
                                        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-gray-400">Hiring</h4>
                                        <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
                                            Actively hiring trainers
                                        </div>
                                    </div>
                                )}

                                {(selectedGym.about?.trim() || selectedGym.gymProfile.bio?.trim()) && (
                                    <div className="mt-5 border-t border-zinc-200/80 pt-4 dark:border-white/10">
                                        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-gray-400">About</h4>
                                        <p className="text-sm leading-6 text-zinc-600 dark:text-gray-300">
                                            {selectedGym.about?.trim() || selectedGym.gymProfile.bio?.trim()}
                                        </p>
                                    </div>
                                )}

                                {selectedGymAmenities.length > 0 && (
                                    <div className="mt-5 border-t border-zinc-200/80 pt-4 dark:border-white/10">
                                        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-gray-400">Amenities</h4>
                                        <p className="text-sm leading-6 text-zinc-600 dark:text-gray-300">
                                            {selectedGymAmenities.join(", ")}
                                        </p>
                                    </div>
                                )}

                                {!!selectedGym.gallery?.length && (
                                    <div className="mt-5 border-t border-zinc-200/80 pt-4 dark:border-white/10">
                                        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-gray-400">Facility Images</h4>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {selectedGym.gallery.map((url) => (
                                                <button
                                                    key={url}
                                                    type="button"
                                                    className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-black dark:border-white/10"
                                                    onClick={() => setLightboxUrl(url)}
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={url}
                                                        alt=""
                                                        className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {mounted && lightboxUrl && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
                    onClick={() => setLightboxUrl(null)}
                    aria-modal="true"
                    role="dialog"
                >
                    <div
                        className="relative max-h-[90vh] max-w-[90vw] rounded-xl bg-white p-6 shadow-lg dark:border dark:border-white/10 dark:bg-neutral-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setLightboxUrl(null)}
                            className="absolute right-4 top-4 rounded-full p-1 transition hover:bg-zinc-100 dark:hover:bg-white/10"
                            aria-label="Close"
                        >
                            <X size={24} />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={lightboxUrl}
                            alt="Preview"
                            className="h-auto max-h-[80vh] w-full max-w-[82vw] rounded-md object-contain"
                        />
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

export default function GymMapPage(props: {
    googleMapsApiKey?: string | null;
}) {
    return <GymDiscoveryPanel {...props} />;
}
