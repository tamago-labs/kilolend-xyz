"use client";

import { useEffect } from "react";
import { useAppStore } from '@/stores/appStore';
import { detectDevice } from '@/utils/deviceDetection';
import { HomeContainer } from '@/components/Home';
import { DesktopHome } from '@/components/Desktop/pages/Home/DesktopHomePage';

export default function Home() {
    const { isMobile, deviceDetected, setIsMobile, setDeviceDetected } = useAppStore(); 

    // Perform device detection immediately on component mount
    useEffect(() => {
        if (!deviceDetected) {
            const deviceInfo = detectDevice();
            setIsMobile(deviceInfo.isMobile);
            setDeviceDetected(true);
        }
    }, [deviceDetected, setIsMobile, setDeviceDetected]);

    // Update page title based on device type
    useEffect(() => {
        if (deviceDetected) {
            if (isMobile) {
                document.title = "KiloLend | LINE Mini Dapp";
            }
        }
    }, [isMobile, deviceDetected]);

    // Mobile: Show HomeContainer with tab navigation
    if (isMobile && deviceDetected) {
        return <HomeContainer />;
    }

    // Show loading state while device is being detected (fallback)
    if (!deviceDetected) {
        return <div>Loading...</div>;
    }

    return <DesktopHome />;
}
