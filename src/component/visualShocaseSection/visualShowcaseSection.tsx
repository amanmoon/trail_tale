"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './visualShowcaseSection.module.css';

const showcasePins = [
  { id: 'pin1', top: '20%', left: '30%', imgSrc: '/tower.jpg', caption: 'Colosseum' },
  { id: 'pin2', top: '50%', left: '80%', imgSrc: '/gardens.jpg', caption: 'Kyoto Gardens' },
  { id: 'pin3', top: '65%', left: '37%', imgSrc: '/machupichu.jpg', caption: 'Machu Picchu' },
  { id: 'pin4', top: '35%', left: '55%', imgSrc: '/col.jpg', caption: 'Colosseum' },
];

const VisualShowcaseSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const isIntersectingRef = useRef(false);

  const [pinsShouldAnimate, setPinsShouldAnimate] = useState(false);

  const minScale = 1.0;
  const maxScale = 1.08;

  useEffect(() => {
    const sectionNode = sectionRef.current;

    const handleScroll = () => {
      if (!isIntersectingRef.current || !sectionNode || !mapContainerRef.current) return;
      const { top, height } = sectionNode.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      let progress = (viewportHeight - top) / (viewportHeight + height);
      progress = Math.max(0, Math.min(1, progress));
      const newScale = minScale + progress * (maxScale - minScale);

      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = requestAnimationFrame(() => {
        if (mapContainerRef.current) {
          mapContainerRef.current.style.transform = `scale(${newScale})`;
        }
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersectingRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          setPinsShouldAnimate(true);
          window.addEventListener('scroll', handleScroll, { passive: true });
          handleScroll();
        } else {
          window.removeEventListener('scroll', handleScroll);
          if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        }
      },
      { rootMargin: '0px 0px -150px 0px', threshold: 0.15 }
    );

    if (sectionNode) observer.observe(sectionNode);

    return () => {
      if (sectionNode) observer.unobserve(sectionNode);
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [minScale, maxScale]);

  return (
    <section className={styles.visualShowcase} ref={sectionRef}>
      <div className={styles.contentWrapper}>
        <span className={styles.eyebrow}>Live Preview</span>
        <h2 className={styles.sectionTitle}>Your World, Beautifully Mapped</h2>
        <p className={styles.sectionSubtitle}>
          See your travel memories come alive as they are elegantly placed on a global canvas.
        </p>
      </div>
      <div
        className={styles.mapContainer}
        ref={mapContainerRef}
        style={{ transform: `scale(${minScale})` }}
      >
        <Image
          src="/world_map.png"
          alt="World map silhouette"
          fill
          style={{ objectFit: 'contain' }}
          className={styles.mapImage}
          quality={85}
        />
        <div className={`${styles.pinsOverlay} ${pinsShouldAnimate ? styles.animatePins : ''}`}>
          {showcasePins.map((pin, index) => (
            <div
              key={pin.id}
              className={styles.photoPin}
              style={{
                top: pin.top,
                left: pin.left,
                animationDelay: `${index * 0.18}s`,
              }}
            >
              <Image
                src={pin.imgSrc}
                alt={pin.caption}
                width={99}
                height={99}
                className={styles.pinImage}
                style={{ objectFit: 'cover' }}
              />
              <span className={styles.pinCaption}>{pin.caption}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VisualShowcaseSection;