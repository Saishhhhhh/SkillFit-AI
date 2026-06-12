import { useState } from 'react';
import { api } from '../lib/api';

export default function SkillVerificationPage({ parsedData, onConfirmed }) {
  const credibility = parsedData.skills.credibility || {};

  // sort out the skills into their correct buckets based on what the ai tagged them as
  const [demonstrated, setDemonstrated] = useState(
    parsedData.skills.all.filter(s => credibility[s] === 'demonstrated')
  );
  const [listed, setListed] = useState(
    parsedData.skills.all.filter(s => credibility[s] === 'listed')
  );
  const [implicit, setImplicit] = useState(
    parsedData.skills.all.filter(s => credibility[s] === 'implicit')
  );

  const [newSkill, setNewSkill] = useState('');
  const [contextNote, setContextNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  function removeSkill(skill, column) {
    if (column === 'demonstrated') setDemonstrated(prev => prev.filter(s => s !== skill));
    if (column === 'listed') setListed(prev => prev.filter(s => s !== skill));
    if (column === 'implicit') setImplicit(prev => prev.filter(s => s !== skill));
  }

  function addSkill() {
    if (!newSkill.trim()) return;
    if ([...demonstrated, ...listed, ...implicit].includes(newSkill.trim())) {
      setError('skill already exists');
      return;
    }
    // we default new skills to the "listed" column
    setListed(prev => [...prev, newSkill.trim()]);
    setNewSkill('');
    setError('');
  }

  async function handleConfirm() {
    setConfirming(true);
    setError('');

    const allSkills = [...demonstrated, ...listed, ...implicit];

    // we need to tell the backend if the user moved any skills around
    const overrides = {};
    demonstrated.forEach(s => overrides[s] = 'demonstrated');
    listed.forEach(s => overrides[s] = 'listed');
    implicit.forEach(s => overrides[s] = 'implicit');

    try {
      const response = await api.post('/api/resume/confirm', {
        resume_id: parsedData.resume_id,
        confirmed_skills: allSkills,
        credibility_overrides: overrides,
        user_context_note: contextNote,
      });

      if (onConfirmed) {
        onConfirmed(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'failed to confirm skills');
    } finally {
      setConfirming(false);
    }
  }

  function SkillChip({ skill, column }) {
    const evidence = parsedData.evidence?.[skill] || '';

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          margin: '4px',
          backgroundColor: column === 'demonstrated' ? '#d4edda' : column === 'implicit' ? '#fff3cd' : '#e2e3e5',
          borderRadius: '20px',
          fontSize: '14px',
          cursor: 'default',
        }}
        title={evidence ? `Evidence: "${evidence}"` : 'No direct evidence found'}
      >
        <span>{skill}</span>
        <span
          onClick={() => removeSkill(skill, column)}
          style={{ cursor: 'pointer', color: '#999', fontWeight: 'bold' }}
        >
          ×
        </span>
      </div>
    );
  }

  function SkillColumn({ title, subtitle, skills, column, color }) {
    return (
      <div style={{
        flex: 1,
        padding: '15px',
        border: `1px solid ${color}`,
        borderRadius: '10px',
        minHeight: '200px',
      }}>
        <h3 style={{ margin: '0 0 5px 0' }}>{title}</h3>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>{subtitle}</p>
        <div>
          {skills.map(skill => (
            <SkillChip key={skill} skill={skill} column={column} />
          ))}
          {skills.length === 0 && (
            <p style={{ color: '#ccc', fontStyle: 'italic' }}>no skills in this category</p>
          )}
        </div>
      </div>
    );
  }

  const totalSkills = demonstrated.length + listed.length + implicit.length;

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>verify your skills</h1>
      <p>
        we found <strong>{totalSkills}</strong> skills in your resume.
        hover over a skill to see the evidence. click × to remove any that are wrong.
      </p>

      {/* three columns */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <SkillColumn
          title="✅ Demonstrated"
          subtitle="proven by experience or projects"
          skills={demonstrated}
          column="demonstrated"
          color="#28a745"
        />
        <SkillColumn
          title="📋 Listed"
          subtitle="mentioned in skills section only"
          skills={listed}
          column="listed"
          color="#6c757d"
        />
        <SkillColumn
          title="🤖 Implicit (AI found)"
          subtitle="inferred from context by AI"
          skills={implicit}
          column="implicit"
          color="#ffc107"
        />
      </div>

      {/* add skill input */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
      }}>
        <input
          type="text"
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addSkill()}
          placeholder="add a skill we missed..."
          style={{ flex: 1, padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <button
          onClick={addSkill}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          + add
        </button>
      </div>

      {/* optional context note */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
          anything else we should know? (optional)
        </label>
        <textarea
          value={contextNote}
          onChange={(e) => setContextNote(e.target.value)}
          placeholder="e.g. I have 6 months of freelance React work not on my resume..."
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            minHeight: '80px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* error */}
      {error && <p style={{ color: 'red' }}>❌ {error}</p>}

      {/* confirm button */}
      <button
        onClick={handleConfirm}
        disabled={confirming || totalSkills === 0}
        style={{
          width: '100%',
          padding: '14px',
          fontSize: '18px',
          backgroundColor: totalSkills === 0 ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: totalSkills === 0 ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
        }}
      >
        {confirming ? 'confirming...' : `confirm ${totalSkills} skills`}
      </button>
    </div>
  );
}
