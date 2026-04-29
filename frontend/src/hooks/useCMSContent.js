import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Hook to fetch CMS content for a specific page
 * @param {string} page - The page to fetch content for (home, program, about)
 * @returns {object} - { content, theme, loading, error }
 */
export const useCMSContent = (page) => {
  const [content, setContent] = useState({});
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [contentRes, themeRes] = await Promise.all([
          axios.get(`${API}/api/public/content/${page}`),
          axios.get(`${API}/api/public/theme`)
        ]);
        
        setContent(contentRes.data || {});
        setTheme(themeRes.data);
      } catch (err) {
        console.error('Error fetching CMS content:', err);
        setError(err.message || 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [page]);

  return { content, theme, loading, error };
};

/**
 * Hook to fetch the official program from CMS
 * @returns {object} - { program, intro, loading, error }
 */
export const useCMSProgram = () => {
  const [program, setProgram] = useState(null);
  const [intro, setIntro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProgram = async (attempt = 1) => {
      setLoading(true);
      setError(null);
      
      try {
        const res = await axios.get(`${API}/api/public/content/program`, { timeout: 8000 });
        const data = res.data || {};
        
        // Sanitize: replace legacy "Tropiques Atrium" with "Grand Carbet du Parc culturel Aimé Césaire"
        let days = data.official_program?.days || [];
        if (days.length > 0) {
          const raw = JSON.stringify(days);
          if (raw.includes('Atrium') || raw.includes('atrium')) {
            days = JSON.parse(
              raw.replace(/Tropiques?\s*Atrium/gi, 'Grand Carbet du Parc culturel Aimé Césaire')
                 .replace(/Atrium/gi, 'Grand Carbet Aimé Césaire')
            );
          }
        }
        
        setProgram(days);
        setIntro(data.intro || {});
      } catch (err) {
        console.error('Error fetching program:', err);
        if (attempt < 3) {
          setTimeout(() => fetchProgram(attempt + 1), 1500 * attempt);
          return;
        }
        // Fallback program data if all retries fail
        setProgram([
          { id: 'day1', date: '2026-05-20', label: 'MERCREDI 20 MAI 2026', theme: 'ACCUEIL & ACCRÉDITATION', site: 'Bibliothèque Schœlcher', slots: [
            { time: '09:00', title: 'Retrait des badges', description: 'Accueil des participants' },
            { time: '10:00', title: 'Cérémonie d\'ouverture', description: 'Discours officiels' },
            { time: '14:00', title: 'Table ronde : Industrie & Politique Culturelle', description: '' },
            { time: '16:30', title: 'Session networking', description: '' },
          ]},
          { id: 'day2', date: '2026-05-21', label: 'JEUDI 21 MAI 2026', theme: 'WORKSHOP & RENCONTRES', site: 'Grand Carbet du Parc culturel Aimé Césaire', slots: [
            { time: '09:30', title: 'Workshop : Distribution digitale', description: '' },
            { time: '11:00', title: 'Formation : Production Musicale', description: '' },
            { time: '14:30', title: 'Speed-meeting professionnels', description: '' },
            { time: '20:00', title: 'Showcases artistiques', description: '' },
          ]},
          { id: 'day3', date: '2026-05-22', label: 'VENDREDI 22 MAI 2026', theme: 'SÉLÉBRASYON 22 MÉ', site: 'Grand Carbet du Parc culturel Aimé Césaire', is_highlight: true, slots: [
            { time: '09:00', title: 'Cérémonie commémorative', description: '' },
            { time: '11:00', title: 'Conférence : Musiques de la diaspora', description: '' },
            { time: '15:00', title: 'Marché Culturel', description: '' },
            { time: '19:00', title: 'Concert CHIMEN SAVANN\'', description: 'Grand Concert Live' },
          ]},
          { id: 'day4', date: '2026-05-23', label: 'SAMEDI 23 MAI 2026', theme: 'BRUNCH & BILAN', site: 'Grand Carbet du Parc culturel Aimé Césaire', slots: [
            { time: '09:30', title: 'Rencontre de clôture', description: '' },
            { time: '11:00', title: 'Signature de partenariats', description: '' },
            { time: '14:00', title: 'Perspectives 2027', description: '' },
            { time: '17:00', title: 'Cérémonie de clôture', description: '' },
          ]},
        ]);
        setIntro({ title: 'Programme Officiel Culture Connect 2026', text: '4 jours de rencontres professionnelles au cœur de Fort-de-France, Martinique.' });
        setError(null); // Don't show error if fallback is used
      } finally {
        setLoading(false);
      }
    };

    fetchProgram();
  }, []);

  return { program, intro, loading, error };
};

/**
 * Hook to fetch CMS theme only
 * @returns {object} - { theme, loading, error }
 */
export const useCMSTheme = () => {
  const [theme, setTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTheme = async () => {
      setLoading(true);
      
      try {
        const res = await axios.get(`${API}/api/public/theme`);
        setTheme(res.data);
      } catch (err) {
        console.error('Error fetching theme:', err);
        setError(err.message);
        // Set default theme on error
        setTheme({
          primary_color: '#A65D47',
          secondary_color: '#C8922A',
          accent_color: '#4A5D4E',
          background_color: '#1A1A1A',
          text_color: '#F4F1EA',
          font_family: 'Inter'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTheme();
  }, []);

  return { theme, loading, error };
};

export default useCMSContent;
