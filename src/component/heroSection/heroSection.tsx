import React from 'react';
import Image from 'next/image';
import styles from './heroSection.module.css';
import Button from '@/component/button/button';

const HeroSection: React.FC = () => {
    return (
        <section className={styles.hero}>
            <div className={styles.heroContainer}>
                <div className={styles.heroContent}>
                    <h1 className={styles.headline}>
                        Map Your Memories. <span className={styles.highlight}>Tell Your Tale.</span>
                    </h1>
                    <p className={styles.subHeadline}>
                        Visually pin your cherished moments on a world map, create stunning photo albums, and relive your journeys like never before.
                    </p>
                    <Button href="/gallery" variant="primary" size="large">
                        Create your own wall!
                    </Button>
                </div>
                <div className={styles.heroImageWrapper}>
                    <div className={`${styles.polaroid} ${styles.polaroidBack}`}>
                        <Image
                            src="/london_eye.jpg" 
                            alt="A travel memory Polaroid - back"
                            width={280} 
                            height={280}
                            className={styles.polaroidImage}
                            objectFit="cover"
                            priority
                        />
                        <div className={styles.polaroidCaption}>
                            The London Eye 
                        </div>
                    </div>

                    <div className={`${styles.polaroid} ${styles.polaroidFront}`}>
                        <Image
                            src="/UK_london.png"
                            alt="A travel memory Polaroid - front"
                            width={300}
                            height={300}
                            className={styles.polaroidImage}
                            objectFit="cover"
                            priority
                        />
                        <div className={styles.polaroidCaption}>
                            United Kingdom
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.heroBackground}></div>
        </section>
    );
};

export default HeroSection;