/**
 * frontend/src/components/TeamSection.js
 * 3x2 grid of team member cards with initials avatars.
 */

const TEAM = [
  {
    name: 'Abhinav',
    role: 'Voice AI & Alert System',
    desc: 'Built the voice interface integration and real-time driver alert pipeline.',
    initials: 'AB',
    color: '#3b82f6',
  },
  {
    name: 'Davik',
    role: 'SOS Framework & Backend APIs',
    desc: 'Architected the SOS emergency chain, Twilio integration, and Express REST APIs.',
    initials: 'DV',
    color: '#ef4444',
  },
  {
    name: 'Mahima',
    role: 'UI/UX Design',
    desc: 'Designed the full user experience, design system, and interface prototypes.',
    initials: 'MH',
    color: '#a855f7',
  },
  {
    name: 'Mihika',
    role: 'ML / Dataset & Model Training',
    desc: 'Curated the pothole dataset and trained the custom YOLOv8 detection model.',
    initials: 'MI',
    color: '#22c55e',
  },
  {
    name: 'Anuj',
    role: 'Graphics, Branding & PPT',
    desc: 'Created all visual assets, pitch deck, and the SafeRoute brand identity.',
    initials: 'AN',
    color: '#f59e0b',
  },
  {
    name: 'Raghav',
    role: 'Lead · Architecture · Security · QA',
    desc: 'Led overall system architecture, Azure security design, and quality assurance.',
    initials: 'RG',
    color: '#06b6d4',
  },
];

export function createTeamSection() {
  const section = document.createElement('section');
  section.className = 'section team-section';
  section.id = 'team';

  section.innerHTML = `
    <div class="container">
      <div class="section-header">
        <span class="section-tag">👥 The Team</span>
        <h2 class="heading-lg">Built by Passionate Engineers</h2>
        <p class="text-muted" style="max-width:480px;margin:var(--space-4) auto 0">
          A multidisciplinary team combining ML, backend engineering, design, and security expertise.
        </p>
      </div>
      <div class="team-grid">
        ${TEAM.map((member, i) => `
          <div class="team-card card reveal" style="animation-delay:${i * 0.1}s">
            <div class="team-avatar" style="background: linear-gradient(135deg, ${member.color}33, ${member.color}11); border-color: ${member.color}44">
              <span class="team-initials" style="color:${member.color}">${member.initials}</span>
            </div>
            <div class="team-info">
              <h3 class="team-name">${member.name}</h3>
              <span class="team-role-badge" style="background:${member.color}22; color:${member.color}; border:1px solid ${member.color}44">
                ${member.role}
              </span>
              <p class="team-desc text-sm text-muted">${member.desc}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  injectTeamStyles();
  return section;
}

function injectTeamStyles() {
  if (document.getElementById('team-styles')) return;
  const style = document.createElement('style');
  style.id = 'team-styles';
  style.textContent = `
    .team-section { background: var(--bg-secondary); }
    .team-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-6);
    }
    .team-card {
      display: flex;
      align-items: flex-start;
      gap: var(--space-4);
      padding: var(--space-5);
    }
    .team-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 2px solid;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .team-initials {
      font-family: var(--font-heading);
      font-size: var(--text-lg);
      font-weight: 800;
    }
    .team-info { display: flex; flex-direction: column; gap: var(--space-2); }
    .team-name {
      font-family: var(--font-heading);
      font-size: var(--text-lg);
      font-weight: 700;
    }
    .team-role-badge {
      display: inline-block;
      font-size: var(--text-xs);
      font-weight: 600;
      padding: 2px var(--space-2);
      border-radius: var(--radius-full);
      letter-spacing: 0.03em;
    }
    .team-desc { line-height: 1.55; margin-top: var(--space-1); }
    @media (max-width: 1024px) { .team-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .team-grid { grid-template-columns: 1fr; } .team-card { flex-direction: column; } }
  `;
  document.head.appendChild(style);
}
