import React from 'react';
import styles from './coreOfferSection.module.css';
import { BsGeoAltFill, BsImages, BsGlobe2 } from 'react-icons/bs';

interface OfferItemProps {
  icon: React.ReactNode; 
  title: string;
  description: string;
}

const OfferItem: React.FC<OfferItemProps> = ({ icon, title, description }) => (
  <div className={styles.offerItem}>
    <div className={styles.iconWrapper}>
      {icon}
    </div>
    <h3 className={styles.itemTitle}>{title}</h3>
    <p className={styles.itemDescription}>{description}</p>
  </div>
);

const offerItemsData: OfferItemProps[] = [
  {
    icon: <BsGeoAltFill />,
    title: "Pin Your Memories",
    description: "Effortlessly place your photos on an interactive world map, marking every step of your adventure."
  },
  {
    icon: <BsImages />, 
    title: "Craft Beautiful Albums",
    description: "Organize your pinned memories into thematic albums, adding narratives and context to your visual stories."
  },
  {
    icon: <BsGlobe2 />,
    title: "Explore & Share",
    description: "Rediscover your own journeys or share your beautifully mapped albums with friends and family."
  }
];

const CoreOfferSection: React.FC = () => {
  return (
    <section className={styles.coreOffer}>
      <div className={styles.contentWrapper}>
        <h2 className={styles.sectionTitle}>
          Bring Your Journeys to Life
        </h2>
        <p className={styles.sectionSubtitle}>
          Trail Tale provides a unique canvas to beautifully document and relive your travel experiences.
        </p>
        <div className={styles.offerGrid}>
          {offerItemsData.map((item) => (
            <OfferItem
              key={item.title} 
              icon={item.icon}
              title={item.title}
              description={item.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoreOfferSection;