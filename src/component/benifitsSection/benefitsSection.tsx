import React from 'react';
import styles from './benefitsSection.module.css';

interface BenefitItemProps {
  icon: string;
  title: string;
  description: string;
}

const BenefitItem: React.FC<BenefitItemProps> = ({ icon, title, description }) => (
  <div className={styles.benefitItem}>
    <span className={styles.benefitIcon}>{icon}</span>
    <h3 className={styles.itemTitle}>{title}</h3>
    <p className={styles.itemDescription}>{description}</p>
  </div>
);

const BenefitsSection: React.FC = () => {
  return (
    <section className={styles.benefitsSection}>
      <div className={styles.contentWrapper}>
        <span className={styles.eyebrow}>Why Trail Tale</span>
        <h2 className={styles.sectionTitle}>More Than Just Photos</h2>
        <p className={styles.sectionSubtitle}>
          Trail Tale transforms your memories into lasting narratives and immersive experiences.
        </p>
        <div className={styles.benefitsGrid}>
          <BenefitItem
            icon="🧭"
            title="Relive & Rediscover"
            description="Navigate your past adventures visually, allowing you to recall details and emotions tied to each location with perfect clarity."
          />
          <BenefitItem
            icon="✍️"
            title="Personalized Storytelling"
            description="Curate your journeys into meaningful stories, adding context beyond a simple photo gallery — your captions, your narrative."
          />
          <BenefitItem
            icon="🔗"
            title="Always Accessible"
            description="Your entire travel journal lives in your browser, instantly accessible whenever you want to revisit your world."
          />
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;