import React from 'react';
import styles from './benefitsSection.module.css';

const BenefitItem: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className={styles.benefitItem}>
    <h3 className={styles.itemTitle}>{title}</h3>
    <p className={styles.itemDescription}>{description}</p>
  </div>
);

const BenefitsSection: React.FC = () => {
  return (
    <section className={styles.benefitsSection}>
      <div className={styles.contentWrapper}>
        <h2 className={styles.sectionTitle}>More Than Just Photos</h2>
        <p className={styles.sectionSubtitle}>
          Trail Tale transforms your memories into lasting narratives and shareable experiences.
        </p>
        <div className={styles.benefitsGrid}>
          <BenefitItem
            title="Relive & Rediscover"
            description="Navigate your past adventures visually, allowing you to recall details and emotions tied to each location."
          />
          <BenefitItem
            title="Personalized Storytelling"
            description="Curate your journeys into meaningful stories, adding context beyond a simple photo gallery."
          />
          <BenefitItem
            title="Unique Sharing Platform"
            description="Share your interactive memory maps and albums, offering a richer way for others to experience your travels."
          />
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;