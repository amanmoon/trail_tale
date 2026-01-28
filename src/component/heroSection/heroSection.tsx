import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './heroSection.module.css';

const HeroSection: React.FC = () => {
    return (
        <section className={styles.hero}>
            <div className={styles.heroContainer}>
                <div className={styles.heroContent}>
                    <div className={styles.tag}>✈️ Your personal travel journal</div>
                    <h1 className={styles.headline}>
                        Map Your Memories.{' '}
                        <span className={styles.highlight}>Tell Your Tale.</span>
                    </h1>
                    <p className={styles.subHeadline}>
                        Visually pin your cherished moments on a world map, create stunning photo albums, and relive your journeys like never before.
                    </p>
                    <div className={styles.heroCta}>
                        <Link href="/gallery" className={styles.ctaPrimary}>
                            Start Your Map →
                        </Link>
                        <a href="#features" className={styles.ctaSecondary}>
                            See how it works
                        </a>
                    </div>
                    <div className={styles.stats}>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>195+</span>
                            <span className={styles.statLabel}>Countries to pin</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>∞</span>
                            <span className={styles.statLabel}>Memories to store</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>Free</span>
                            <span className={styles.statLabel}>Always & forever</span>
                        </div>
                    </div>
                </div>
                <div className={styles.heroImageWrapper}>
                    <div className={`${styles.polaroid} ${styles.polaroidBack}`}>
                        <Image
                            src="/london_eye.jpg"
                            alt="The London Eye"
                            width={324}
                            height={324}
                            className={styles.polaroidImage}
                            priority
                        />
                        <div className={styles.polaroidCaption}>The London Eye</div>
                    </div>
                    <div className={`${styles.polaroid} ${styles.polaroidFront}`}>
                        <Image
                            src="/UK_london.png"
                            alt="United Kingdom"
                            width={348}
                            height={348}
                            className={styles.polaroidImage}
                            priority
                        />
                        <div className={styles.polaroidCaption}>United Kingdom</div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;