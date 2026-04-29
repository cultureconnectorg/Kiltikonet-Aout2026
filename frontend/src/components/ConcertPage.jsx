import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Music, Clock, MapPin, Mic2, Calendar, Disc3 } from 'lucide-react';
import { Button } from './ui/button';
import { LegalFooter } from './legal';
import { useSharedData } from '../contexts/SharedDataContext';
import { useIntersectionObserver } from '../hooks/useAnimations';
import { useLanguage } from '../context/LanguageContext';

const ArtistCard = ({ artist, index }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.15 });
  const [isHovered, setIsHovered] = useState(false);
  const isConfirmed = artist.status === 'Confirmé';

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-2xl border-2 transition-all duration-500"
      style={{
        borderColor: isHovered ? '#A65D47' : 'rgba(26,21,16,0.1)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.6s ease-out ${index * 0.1}s, transform 0.6s ease-out ${index * 0.1}s, border-color 0.3s`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`concert-artist-${artist.id}`}
    >
      {/* Artist header gradient */}
      <div
        className="relative px-6 py-8 text-center"
        style={{
          background: isConfirmed
            ? 'linear-gradient(135deg, #1A1510 0%, #2A2520 100%)'
            : 'linear-gradient(135deg, #2A2520 0%, #3A3530 100%)',
        }}
      >
        {/* Status badge */}
        {isConfirmed && (
          <span className="absolute top-3 right-3 text-xs px-3 py-1 rounded-full font-medium" style={{ background: '#4A5D4E', color: '#E8E0D0' }}>
            Confirmé
          </span>
        )}

        {/* Avatar */}
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-bold mb-4 transition-transform duration-300"
          style={{
            background: isConfirmed ? 'linear-gradient(135deg, #A65D47, #C9A84C)' : 'linear-gradient(135deg, #6B6560, #8B8580)',
            color: '#F4F0E8',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          {artist.name?.charAt(0) || '?'}
        </div>

        <h3 className="font-syne font-bold text-xl mb-1" style={{ color: '#F4F0E8' }}>
          {artist.name}
        </h3>
        {artist.genre && (
          <p className="text-sm" style={{ color: 'rgba(244,240,232,0.6)' }}>
            {artist.genre}
          </p>
        )}
      </div>

      {/* Details */}
      <div className="px-6 py-4 space-y-2" style={{ background: '#FFFFFF' }}>
        {artist.horaire && (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#6B6560' }}>
            <Clock className="w-4 h-4" style={{ color: '#C9A84C' }} />
            <span>{artist.horaire}</span>
          </div>
        )}
        {artist.scene && (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#6B6560' }}>
            <Mic2 className="w-4 h-4" style={{ color: '#A65D47' }} />
            <span>{artist.scene}</span>
          </div>
        )}
        {!artist.horaire && !artist.scene && (
          <div className="flex items-center gap-2 text-sm" style={{ color: '#6B6560' }}>
            <Disc3 className="w-4 h-4" style={{ color: '#C9A84C' }} />
            <span>Horaire à confirmer</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ConcertPage = () => {
  const navigate = useNavigate();
  const { artistes } = useSharedData();
  const { language } = useLanguage();
  const [heroVisible, setHeroVisible] = useState(false);

  const confirmedArtists = artistes.filter(a => a.status === 'Confirmé');
  const pendingArtists = artistes.filter(a => a.status !== 'Confirmé');

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#F4F0E8' }} data-testid="concert-page">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'rgba(244,240,232,0.95)', backdropFilter: 'blur(8px)', borderColor: 'rgba(26,21,16,0.1)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 transition-colors"
            style={{ color: 'rgba(26,21,16,0.6)' }}
            data-testid="concert-back-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Retour</span>
          </button>
          <h1 className="font-serif text-xl" style={{ color: '#1A1510' }}>Culture Connect 2026</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Hero — CHIMEN SAVANN' Flyer */}
      <section className="relative overflow-hidden" style={{ background: '#1A1510' }}>
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
          {/* Concert Flyer Image */}
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'scale(1)' : 'scale(0.95)',
              transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
            }}
          >
            <img
              src={language === 'en' ? '/concert/chimen-savann-en.png' : '/concert/chimen-savann-fr.png'}
              alt="CHIMEN SAVANN' — Concert Live — 22 Mai 2026 — Grand Carbet du Parc culturel Aimé Césaire"
              className="w-full h-auto"
              data-testid="concert-flyer"
            />
          </div>
        </div>
      </section>

      {/* Info bar */}
      <div className="border-b" style={{ background: '#E8E0D0', borderColor: 'rgba(26,21,16,0.1)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: '#6B6560' }}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: '#C9A84C' }} />
            <span>Vendredi 22 Mai 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" style={{ color: '#A65D47' }} />
            <span>Grand Carbet du Parc culturel Aimé Césaire, Fort-de-France</span>
          </div>
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4" style={{ color: '#C9A84C' }} />
            <span>{artistes.length} artiste{artistes.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Confirmed Artists */}
      {confirmedArtists.length > 0 && (
        <section className="py-16" data-testid="confirmed-artists-section">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full" style={{ background: '#4A5D4E' }} />
              <h2 className="font-serif text-2xl" style={{ color: '#1A1510' }}>
                Artistes confirmés
              </h2>
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(74,93,78,0.1)', color: '#4A5D4E' }}>
                {confirmedArtists.length}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {confirmedArtists.map((artist, i) => (
                <ArtistCard key={artist.id} artist={artist} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pending Artists */}
      {pendingArtists.length > 0 && (
        <section className="py-16 border-t" style={{ borderColor: 'rgba(26,21,16,0.1)' }} data-testid="pending-artists-section">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full" style={{ background: '#C9A84C' }} />
              <h2 className="font-serif text-2xl" style={{ color: '#1A1510' }}>
                À confirmer
              </h2>
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>
                {pendingArtists.length}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingArtists.map((artist, i) => (
                <ArtistCard key={artist.id} artist={artist} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state — Animated "Line-up à venir" showcase */}
      {artistes.length === 0 && (
        <section className="py-24 overflow-hidden" data-testid="lineup-coming-soon">
          <div className="max-w-6xl mx-auto px-4 text-center">
            {/* Animated music wave */}
            <div className="flex items-end justify-center gap-1 mb-8 h-16">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 rounded-full"
                  style={{
                    background: i % 3 === 0 ? '#A65D47' : i % 3 === 1 ? '#C9A84C' : '#4A5D4E',
                    animation: `wave ${0.8 + (i % 4) * 0.2}s ease-in-out ${i * 0.1}s infinite alternate`,
                  }}
                />
              ))}
            </div>

            <h2
              className="font-serif text-4xl sm:text-5xl mb-4"
              style={{
                color: '#1A1510',
                animation: 'fadeSlideUp 1s ease-out 0.3s both',
              }}
            >
              Line-up à venir
            </h2>
            <p
              className="text-lg mb-8 max-w-xl mx-auto"
              style={{
                color: '#6B6560',
                animation: 'fadeSlideUp 1s ease-out 0.6s both',
              }}
            >
              Les artistes qui feront vibrer le Grand Carbet seront révélés très prochainement.
              Restez connectés !
            </p>

            {/* Animated placeholder cards */}
            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="relative rounded-2xl border-2 border-dashed overflow-hidden"
                  style={{
                    borderColor: 'rgba(26,21,16,0.15)',
                    animation: `fadeSlideUp 0.8s ease-out ${0.8 + i * 0.2}s both`,
                  }}
                >
                  <div className="px-6 py-10" style={{ background: 'rgba(26,21,16,0.03)' }}>
                    <div
                      className="w-16 h-16 mx-auto rounded-full mb-4 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${['#A65D47', '#C9A84C', '#4A5D4E'][i]}30, ${['#A65D47', '#C9A84C', '#4A5D4E'][i]}10)`,
                        animation: `pulse 2s ease-in-out ${i * 0.5}s infinite`,
                      }}
                    >
                      <Music className="w-7 h-7" style={{ color: ['#A65D47', '#C9A84C', '#4A5D4E'][i], opacity: 0.5 }} />
                    </div>
                    <div className="h-4 w-24 mx-auto rounded" style={{ background: 'rgba(26,21,16,0.08)' }} />
                    <div className="h-3 w-16 mx-auto mt-2 rounded" style={{ background: 'rgba(26,21,16,0.05)' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Countdown teaser */}
            <div
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full"
              style={{
                background: 'rgba(166,93,71,0.08)',
                animation: 'fadeSlideUp 1s ease-out 1.4s both',
              }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: '#A65D47', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span className="text-sm font-medium" style={{ color: '#A65D47' }}>
                22 Mai 2026 — Grand Carbet du Parc culturel Aimé Césaire, Fort-de-France
              </span>
            </div>
          </div>

          <style>{`
            @keyframes wave {
              0% { height: 8px; }
              100% { height: 56px; }
            }
            @keyframes fadeSlideUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.7; }
              50% { transform: scale(1.05); opacity: 1; }
            }
          `}</style>
        </section>
      )}

      {/* CTA */}
      <section className="py-12" style={{ background: 'rgba(26,21,16,0.05)' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="font-serif text-2xl mb-4" style={{ color: '#1A1510' }}>
            Réservez votre place
          </h3>
          <p className="mb-6" style={{ color: '#6B6560' }}>
            Inscrivez-vous maintenant pour ne rien manquer de Culture Connect 2026.
          </p>
          <Button
            onClick={() => navigate('/tarifs')}
            className="text-white"
            style={{ background: '#A65D47' }}
            data-testid="concert-cta-btn"
          >
            Voir les tarifs
          </Button>
        </div>
      </section>

      <LegalFooter />
    </div>
  );
};

export default ConcertPage;
