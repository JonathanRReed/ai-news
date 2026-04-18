import React, { useRef } from "react";

interface SpotlightCardProps {
    children: React.ReactNode;
    className?: string;
    spotlightColor?: string;
    borderColor?: string;
    backgroundColor?: string;
}

type SpotlightStyle = React.CSSProperties & {
    "--spotlight-x": string;
    "--spotlight-y": string;
    "--spotlight-opacity": string;
};

const SpotlightCard: React.FC<SpotlightCardProps> = ({
    children,
    className = "",
    spotlightColor = "rgba(255, 255, 255, 0.25)",
    borderColor = "rgba(255, 255, 255, 0.1)",
    backgroundColor = "rgba(255, 255, 255, 0.03)",
}) => {
    const divRef = useRef<HTMLDivElement>(null);
    const articleStyle: SpotlightStyle = {
        borderColor: borderColor,
        background: backgroundColor,
        "--spotlight-x": "50%",
        "--spotlight-y": "50%",
        "--spotlight-opacity": "0",
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;

        const rect = divRef.current.getBoundingClientRect();
        divRef.current.style.setProperty("--spotlight-x", `${e.clientX - rect.left}px`);
        divRef.current.style.setProperty("--spotlight-y", `${e.clientY - rect.top}px`);
    };

    const handleMouseEnter = () => {
        divRef.current?.style.setProperty("--spotlight-opacity", "1");
    };

    const handleMouseLeave = () => {
        divRef.current?.style.setProperty("--spotlight-opacity", "0");
    };

    return (
        <article
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative overflow-hidden border transition-colors duration-300 ${className}`}
            style={articleStyle}
        >
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
                style={{
                    opacity: "var(--spotlight-opacity)",
                    background: `radial-gradient(520px circle at var(--spotlight-x) var(--spotlight-y), ${spotlightColor}, transparent 42%)`,
                }}
            />
            <div className="relative h-full">{children}</div>
        </article>
    );
};

export default SpotlightCard;
