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
    const fetchProgram = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const res = await axios.get(`${API}/api/public/content/program`);
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
        setError(err.message || 'Failed to load program');
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
