import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export interface BlueprintMatrixProps {
	startFrame?: number;
	buildStartFrame?: number;
	endFrame?: number;
}

export const BlueprintMatrix: React.FC<BlueprintMatrixProps> = ({
	startFrame = 0,
	buildStartFrame = 90,
	endFrame = 135,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	if (frame < startFrame || frame > endFrame) return null;

	// Entrance animation (staggered springs)
	const entranceProgress = (index: number) =>
		spring({
			frame: frame - startFrame - index * 5,
			fps,
			config: { damping: 12, stiffness: 120 },
		});

	// Build compaction animation
	const buildProgress = interpolate(
		frame,
		[buildStartFrame, endFrame],
		[0, 1],
		{ extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
	);

	// Exit fade
	const exitOpacity = interpolate(frame, [endFrame - 15, endFrame], [1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

	// Pulse effect for veins
	const pulseOffset = Math.sin((frame / 30) * Math.PI * 2) * 100;

	// Plane configuration
	const planes = Array.from({ length: 5 }).map((_, i) => {
		const zOffset = 20 * (4 - i);
		const scale = interpolate(buildProgress, [0, 1], [1, 0.7]);
		const translateY = interpolate(buildProgress, [0, 1], [0, (4 - i) * 10]);
		const glowIntensity = interpolate(buildProgress, [0, 1], [1, 1.5]);

		return {
			id: i,
			zIndex: 5 - i,
			style: {
				transform: `
            perspective(800px) 
            rotateX(${45 - buildProgress * 15}deg) 
            rotateZ(${-15 + buildProgress * 10}deg)
            translateZ(${zOffset * (1 - buildProgress)}px)
            translateY(${translateY}px)
            scale(${scale})
          `,
				opacity: entranceProgress(i) * exitOpacity,
				boxShadow: `0 0 ${10 * glowIntensity}px rgba(74, 106, 255, ${
					0.25 * glowIntensity
				})`,
			},
		};
	});

	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				height: '100%',
				backgroundColor: 'transparent',
				pointerEvents: 'none',
			}}
		>
			{/* Label */}
			<div
				style={{
					position: 'absolute',
					top: 64,
					left: 0,
					right: 0,
					textAlign: 'center',
					color: '#8A95A7',
					fontFamily: "'Inter', monospace, sans-serif",
					fontSize: 16,
					fontWeight: 600,
					letterSpacing: '4px',
					opacity: interpolate(frame, [startFrame, startFrame + 30], [0, 1], {
						extrapolateLeft: 'clamp',
						extrapolateRight: 'clamp',
					}) * exitOpacity,
				}}
			>
				DOCKERFILE // BLUEPRINT MATRIX
			</div>

			{/* Planes */}
			{planes.map((plane) => (
				<div
					key={plane.id}
					style={{
						position: 'absolute',
						width: 680,
						height: 260,
						left: 640 - 340,
						top: 400 - 130 + plane.id * 10,
						background: 'rgba(30, 36, 45, 0.55)',
						border: '1px solid rgba(74, 106, 255, 0.35)',
						borderRadius: 6,
						transformStyle: 'preserve-3d',
						zIndex: plane.zIndex,
						...plane.style,
					}}
				>
					{/* Grid Lines */}
					<svg
						viewBox="0 0 680 260"
						style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
					>
						{/* Horizontal lines */}
						{Array.from({ length: 10 }).map((_, i) => (
							<line
								key={`h-${i}`}
								x1="0"
								y1={i * 26}
								x2="680"
								y2={i * 26}
								stroke="#4A6AFF"
								strokeOpacity={0.35}
								strokeWidth="1"
							/>
						))}
						{/* Vertical lines */}
						{Array.from({ length: 20 }).map((_, i) => (
							<line
								key={`v-${i}`}
								x1={i * 34}
								y1="0"
								x2={i * 34}
								y2="260"
								stroke="#4A6AFF"
								strokeOpacity={0.35}
								strokeWidth="1"
							/>
						))}

						{/* Logic Veins */}
						<path
							d="M 50 50 Q 200 30, 300 80 T 600 100"
							fill="none"
							stroke="#4A6AFF"
							strokeWidth="2"
							strokeDasharray="100"
							strokeDashoffset={100 - (pulseOffset + 100) * entranceProgress(plane.id)}
						/>
						<path
							d="M 100 150 Q 300 180, 500 130 T 650 200"
							fill="none"
							stroke="#A0D8FF"
							strokeWidth="1.5"
							strokeDasharray="120"
							strokeDashoffset={120 - (pulseOffset + 120) * entranceProgress(plane.id) * 0.7}
						/>

						{/* Command Sigils */}
						{/* FROM - Nesting squares */}
						<rect x="50" y="50" width="30" height="30" fill="none" stroke="#4A6AFF" strokeWidth="1.5" />
						<rect x="55" y="55" width="20" height="20" fill="none" stroke="#4A6AFF" strokeWidth="1.5" />

						{/* COPY - Stacked lines */}
						<line x1="150" y1="60" x2="200" y2="60" stroke="#4A6AFF" strokeWidth="2" strokeLinecap="round" />
						<line x1="150" y1="70" x2="190" y2="70" stroke="#4A6AFF" strokeWidth="2" strokeLinecap="round" />
						<line x1="150" y1="80" x2="180" y2="80" stroke="#4A6AFF" strokeWidth="2" strokeLinecap="round" />

						{/* RUN - Concentric arcs */}
						<circle cx="300" cy="70" r="20" fill="none" stroke="#A0D8FF" strokeWidth="1.5" />
						<circle cx="300" cy="70" r="15" fill="none" stroke="#A0D8FF" strokeWidth="1.5" />
						<circle cx="300" cy="70" r="10" fill="none" stroke="#A0D8FF" strokeWidth="1.5" />
					</svg>
				</div>
			))}
		</div>
	);
};

export default BlueprintMatrix;
