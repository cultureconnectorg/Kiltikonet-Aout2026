import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, MapPin, Briefcase, Users, Globe, Building2, Mic2, Newspaper, MoreHorizontal, Mail, Grid, List, Sparkles, X, ArrowRight, Tag, Check } from 'lucide-react';
import { profileTypes, countryList, expertiseTags } from '../lib/translations';
import { BadgeGenerator } from './BadgeGenerator';
import axios from 'axios';
import { Reveal, useIntersectionObserver } from '../hooks/useAnimations';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const API_V1 = `${BACKEND_URL}/api/v1`;

const tierConfig = {
  emerging: { name: 'Émergent', nameEn: 'Emerging', color: '#4A5D4E' },
  professional: { name: 'Professionnel', nameEn: 'Professional', color: '#A65D47' },
  institutional: { name: 'Institutionnel', nameEn: 'Institutional', color: '#1A1A1A' }
};

const profileIcons = {
  'artist': Mic2, 'label': Building2, 'booking_agency': Globe,
  'institution': Building2, 'press': Newspaper, 'other': MoreHorizontal
};

// Pas de placeholderImages — les participants sans photo utilisent le fallback initiales/KKAvatar

// Animated Participant Card
const ParticipantCard = ({ participant, language, filters, onBadgeClick, onSmartClick, viewMode }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1 });
  const [isHovered, setIsHovered] = useState(false);
  
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const tier = tierConfig[participant.tier] || tierConfig.professional;
  const Icon = profileIcons[participant.profile_type] || Users;
  const pTags = participant.expertise_tags || [];
  
  const getSharedInterestsCount = (participantTags, filterTags) => {
    if (!participantTags || !filterTags || filterTags.length === 0) return 0;
    return participantTags.filter(t => filterTags.includes(t)).length;
  };
  
  const sharedCount = getSharedInterestsCount(pTags, filters.expertiseTags);

  const getProfileLabel = (type) => {
    const p = profileTypes.find(x => x.value === type);
    return p ? (language === 'fr' ? p.labelFr : p.labelEn) : type;
  };

  const getCountryLabel = (code) => {
    const c = countryList.find(x => x.value === code);
    return c ? code : code;
  };

  if (viewMode === 'list') {
    return (
      <div 
        ref={ref}
        className="flex items-center gap-4 p-4 border border-lightborder bg-cream hover:border-terracotta transition-all"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
          transition: prefersReducedMotion ? 'opacity 0.3s' : 'opacity 0.4s ease-out, transform 0.4s ease-out',
        }}
      >
        {participant.image
          ? <img src={participant.image} alt={participant.full_name} className="w-16 h-16 object-cover flex-shrink-0" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
          : <div className="w-16 h-16 flex-shrink-0 bg-charcoal/5 flex items-center justify-center"><span className="font-serif text-2xl text-charcoal/30">{(participant.full_name || '?')[0].toUpperCase()}</span></div>
        }
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-charcoal truncate">{participant.full_name}</h3>
          <p className="text-sm text-charcoal/60 truncate">{participant.organization_name}</p>
          {pTags.length > 0 && (
            <div className="flex gap-1 mt-1">
              {pTags.slice(0, 2).map((tagValue) => {
                const tagInfo = expertiseTags.find(t => t.value === tagValue);
                return tagInfo && (
                  <span key={tagValue} className="px-1.5 py-0.5 text-xs bg-charcoal/10 text-charcoal/60">
                    {language === 'fr' ? tagInfo.labelFr : tagInfo.labelEn}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {sharedCount > 0 && (
          <span className="hidden sm:flex items-center gap-1 px-2 py-1 bg-terracotta/10 text-terracotta text-xs">
            <Sparkles className="w-3 h-3" /> {sharedCount}
          </span>
        )}
        <span className="hidden sm:block px-3 py-1 text-xs font-syne" style={{ backgroundColor: tier.color, color: '#F4F1EA' }}>
          {language === 'fr' ? tier.name : tier.nameEn}
        </span>
        <button onClick={() => onBadgeClick(participant)} className="px-4 py-2 border border-charcoal text-charcoal text-sm hover:bg-charcoal hover:text-paper">
          Badge
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={ref}
      className={`border border-lightborder bg-cream group transition-all duration-300 ${
        isHovered ? 'border-terracotta -translate-y-1 shadow-lg' : ''
      }`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible 
          ? (isHovered ? 'translateY(-4px)' : 'translateY(0)') 
          : 'translateY(30px)',
        transition: prefersReducedMotion 
          ? 'opacity 0.3s ease-out' 
          : 'opacity 0.5s ease-out, transform 0.5s ease-out',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`participant-card-${participant.id}`}
    >
      <div className="relative h-48 overflow-hidden">
        {participant.image
          ? <img src={participant.image} alt={participant.full_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} />
          : <div className="w-full h-full bg-charcoal/5 flex items-center justify-center"><span className="font-serif text-6xl text-charcoal/15">{(participant.full_name || '?')[0].toUpperCase()}</span></div>
        }
        <div className="absolute top-3 right-3 px-3 py-1 text-xs font-syne" style={{ backgroundColor: tier.color, color: '#F4F1EA' }}>
          {language === 'fr' ? tier.name : tier.nameEn}
        </div>
        {participant.stand_request && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-sage text-paper text-xs">Stand</div>
        )}
        {sharedCount > 0 && (
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-terracotta/90 text-paper text-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {sharedCount} {language === 'fr' ? 'intérêt(s) commun(s)' : 'shared interest(s)'}
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-charcoal/40" />
          <span className="text-xs text-charcoal/50">{getProfileLabel(participant.profile_type)}</span>
        </div>
        <h3 className="font-serif text-lg text-charcoal mb-1">{participant.full_name}</h3>
        <p className="text-sm text-charcoal/60 mb-3">{participant.organization_name}</p>
        
        {pTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {pTags.slice(0, 3).map((tagValue) => {
              const tagInfo = expertiseTags.find(t => t.value === tagValue);
              const isShared = filters.expertiseTags?.includes(tagValue);
              return tagInfo && (
                <span 
                  key={tagValue} 
                  className={`px-2 py-0.5 text-xs ${isShared ? 'bg-sage text-paper' : 'bg-charcoal/10 text-charcoal/60'}`}
                >
                  {language === 'fr' ? tagInfo.labelFr : tagInfo.labelEn}
                </span>
              );
            })}
            {pTags.length > 3 && (
              <span className="px-2 py-0.5 text-xs bg-lightborder text-charcoal/50">
                +{pTags.length - 3}
              </span>
            )}
          </div>
        )}
        
        <div className="flex gap-2 mb-4">
          <span className="px-2 py-1 border border-lightborder text-xs text-charcoal/60">{getCountryLabel(participant.country)}</span>
          <span className="px-2 py-1 border border-lightborder text-xs text-charcoal/60">B2B</span>
        </div>
        <p className="text-sm text-charcoal/50 line-clamp-2 mb-4">{participant.bio}</p>
        <div className="flex gap-2">
          <button 
            onClick={() => onBadgeClick(participant)}
            className="flex-1 py-2 border border-charcoal text-charcoal text-sm font-syne hover:bg-charcoal hover:text-paper transition-colors"
          >
            Badge
          </button>
          <button 
            onClick={() => onSmartClick(participant.id)}
            className="flex-1 py-2 bg-sage text-paper text-sm font-syne hover:bg-sage/90 flex items-center justify-center gap-1"
            title={language === 'fr' ? 'Trouver des partenaires similaires' : 'Find similar partners'}
          >
            <Sparkles className="w-4 h-4" />
            Smart
          </button>
        </div>
      </div>
    </div>
  );
};

export const CatalogPage = () => {
  const { language, t } = useLanguage();
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({ search: '', region: '', sector: '', tier: '', expertiseTags: [] });
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sectorKeywords, setSectorKeywords] = useState([]);
  const [showExpertiseFilter, setShowExpertiseFilter] = useState(false);
  const [similarityScores, setSimilarityScores] = useState({});
  const [headerVisible, setHeaderVisible] = useState(false);

  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setHeaderVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const fetchParticipants = useCallback(async (attempt = 1) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/catalog`, { timeout: 8000 });
      const catalogParticipants = response.data.participants || [];
      
      const approvedParticipants = catalogParticipants
        .filter(p => p.status === 'approved')
        .map((p, i) => ({
          ...p,
          image: p.logo_url || null,
          tier: p.tier || 'professional'
        }));
      
      setParticipants(approvedParticipants);
      setFilteredParticipants(approvedParticipants);
      
      try {
        const suggestionsRes = await axios.get(`${API_V1}/search/match?limit=5`);
        setSectorKeywords(suggestionsRes.data.suggestions || []);
      } catch (e) {
      }
    } catch (error) {
      console.error('Error fetching catalog:', error);
      if (attempt < 3) {
        setTimeout(() => fetchParticipants(attempt + 1), 1500 * attempt);
        return;
      }
      setParticipants([]);
      setFilteredParticipants([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Smart Connect: Get partner suggestions for a participant
  const fetchSuggestionsFor = async (participantId) => {
    try {
      const response = await axios.get(`${API_V1}/search/suggestions?participant_id=${participantId}`);
      setSuggestions(response.data.suggested_connections || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  // Toggle expertise tag filter
  const toggleExpertiseFilter = (tagValue) => {
    setFilters(prev => {
      const current = prev.expertiseTags || [];
      if (current.includes(tagValue)) {
        return { ...prev, expertiseTags: current.filter(t => t !== tagValue) };
      } else {
        return { ...prev, expertiseTags: [...current, tagValue] };
      }
    });
  };
  
  // Smart Connect: Search by sector keyword
  const searchBySector = async (keyword) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_V1}/search/match?sector=${encodeURIComponent(keyword)}&limit=20`);
      const results = response.data.results || [];
      const mappedResults = results.map((r, i) => ({
        ...r,
        full_name: r.name,
        image: r.image_url || null
      }));
      setFilteredParticipants(mappedResults);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchParticipants(); }, [fetchParticipants]);

  useEffect(() => {
    let result = [...participants];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(p => p.full_name?.toLowerCase().includes(s) || p.organization_name?.toLowerCase().includes(s));
    }
    if (filters.region) result = result.filter(p => p.country === filters.region);
    if (filters.sector) result = result.filter(p => p.profile_type === filters.sector);
    if (filters.tier) result = result.filter(p => p.tier === filters.tier);
    
    // Filter by expertise tags
    if (filters.expertiseTags && filters.expertiseTags.length > 0) {
      result = result.filter(p => {
        const pTags = p.expertise_tags || [];
        return filters.expertiseTags.some(ft => pTags.includes(ft));
      });
      // Sort by number of shared interests
      result.sort((a, b) => {
        const aShared = getSharedInterestsCount(a.expertise_tags, filters.expertiseTags);
        const bShared = getSharedInterestsCount(b.expertise_tags, filters.expertiseTags);
        return bShared - aShared;
      });
    }
    
    setFilteredParticipants(result);
  }, [filters, participants]);

  const getProfileLabel = (type) => {
    const p = profileTypes.find(x => x.value === type);
    return p ? t(p.labelKey) : type;
  };

  const getCountryLabel = (code) => {
    const c = countryList.find(x => x.value === code);
    return c ? (t(`countries.${c.labelKey}`) !== `countries.${c.labelKey}` ? t(`countries.${c.labelKey}`) : code) : code;
  };

  return (
    <div className="min-h-screen bg-paper pt-24 sm:pt-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <p 
            className="text-terracotta font-syne text-sm tracking-widest uppercase mb-4"
            style={{
              opacity: headerVisible ? 1 : 0,
              transform: headerVisible ? 'translateY(0)' : 'translateY(-20px)',
              transition: prefersReducedMotion 
                ? 'opacity 0.3s ease-out' 
                : 'opacity 0.5s ease-out, transform 0.5s ease-out',
            }}
          >
            {language === 'fr' ? 'Répertoire' : 'Directory'}
          </p>
          <h1 
            className="font-serif text-4xl sm:text-5xl text-charcoal mb-4"
            style={{
              opacity: headerVisible ? 1 : 0,
              transform: headerVisible ? 'translateY(0)' : 'translateY(-30px)',
              transition: prefersReducedMotion 
                ? 'opacity 0.3s ease-out' 
                : 'opacity 0.6s ease-out 0.15s, transform 0.6s ease-out 0.15s',
            }}
          >
            Catalogue
          </h1>
          <p 
            className="text-charcoal/60 max-w-2xl mx-auto"
            style={{
              opacity: headerVisible ? 1 : 0,
              transform: headerVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: prefersReducedMotion 
                ? 'opacity 0.3s ease-out' 
                : 'opacity 0.6s ease-out 0.3s, transform 0.6s ease-out 0.3s',
            }}
          >
            {language === 'fr' ? 'Découvrez les professionnels accrédités' : 'Discover accredited professionals'}
          </p>
        </div>

        {/* Filters */}
        <div className="border border-lightborder bg-cream p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
              <Input
                placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'}
                aria-label={language === 'fr' ? 'Rechercher dans le catalogue' : 'Search the catalogue'}                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-11 h-12 bg-paper border-lightborder text-charcoal rounded-none"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={filters.region} onValueChange={(v) => setFilters(prev => ({ ...prev, region: v === 'all' ? '' : v }))}>
                <SelectTrigger className="w-[140px] h-12 bg-paper border-lightborder text-charcoal rounded-none">
                  <SelectValue placeholder={language === 'fr' ? 'Région' : 'Region'} />
                </SelectTrigger>
                <SelectContent className="bg-paper border-lightborder">
                  <SelectItem value="all">{language === 'fr' ? 'Toutes' : 'All'}</SelectItem>
                  {countryList.slice(0, 8).map(c => (
                    <SelectItem key={c.value} value={c.value}>{getCountryLabel(c.value)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.sector} onValueChange={(v) => setFilters(prev => ({ ...prev, sector: v === 'all' ? '' : v }))}>
                <SelectTrigger className="w-[140px] h-12 bg-paper border-lightborder text-charcoal rounded-none">
                  <SelectValue placeholder={language === 'fr' ? 'Secteur' : 'Sector'} />
                </SelectTrigger>
                <SelectContent className="bg-paper border-lightborder">
                  <SelectItem value="all">{language === 'fr' ? 'Tous' : 'All'}</SelectItem>
                  {profileTypes.map(p => (
                    <SelectItem key={p.value} value={p.value}>{t(p.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex border border-lightborder bg-paper">
                <button onClick={() => setViewMode('grid')} className={`p-3 ${viewMode === 'grid' ? 'bg-charcoal text-paper' : 'text-charcoal/50'}`}>
                  <Grid className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-3 ${viewMode === 'list' ? 'bg-charcoal text-paper' : 'text-charcoal/50'}`}>
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-charcoal/50">
            {filteredParticipants.length} {language === 'fr' ? 'participant(s)' : 'participant(s)'}
            {filters.expertiseTags?.length > 0 && (
              <span className="ml-2 text-sage">
                ({language === 'fr' ? 'filtré par' : 'filtered by'} {filters.expertiseTags.length} {language === 'fr' ? 'intérêt(s)' : 'interest(s)'})
              </span>
            )}
          </p>
          
          {/* Expertise Tags Filter */}
          <div className="mt-4 pt-4 border-t border-lightborder">
            <button 
              onClick={() => setShowExpertiseFilter(!showExpertiseFilter)}
              className="flex items-center gap-2 text-xs text-charcoal/60 hover:text-terracotta transition-colors mb-3"
            >
              <Tag className="w-4 h-4" />
              <span className="uppercase font-syne">
                {language === 'fr' ? 'Filtrer par intérêts' : 'Filter by interests'}
              </span>
              {filters.expertiseTags?.length > 0 && (
                <span className="px-2 py-0.5 bg-sage text-paper text-xs">{filters.expertiseTags.length}</span>
              )}
            </button>
            
            {showExpertiseFilter && (
              <div className="flex flex-wrap gap-2 mb-4">
                {expertiseTags.map((tag) => {
                  const isSelected = filters.expertiseTags?.includes(tag.value);
                  return (
                    <button
                      key={tag.value}
                      onClick={() => toggleExpertiseFilter(tag.value)}
                      className={`px-3 py-1.5 text-xs font-syne transition-all border ${
                        isSelected 
                          ? 'border-sage bg-sage text-paper' 
                          : 'border-lightborder bg-paper text-charcoal/70 hover:border-terracotta'
                      }`}
                    >
                      {language === 'fr' ? tag.labelFr : tag.labelEn}
                      {isSelected && <Check className="w-3 h-3 inline ml-1" />}
                    </button>
                  );
                })}
                {filters.expertiseTags?.length > 0 && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, expertiseTags: [] }))}
                    className="px-3 py-1.5 text-xs border border-terracotta/30 text-terracotta hover:bg-terracotta/10"
                  >
                    {language === 'fr' ? 'Effacer' : 'Clear'}
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Smart Connect - Sector Keywords */}
          {sectorKeywords.length > 0 && (
            <div className="mt-4 pt-4 border-t border-lightborder">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-terracotta" />
                <span className="text-xs text-charcoal/50 uppercase font-syne">
                  {language === 'fr' ? 'Recherche par secteur' : 'Search by sector'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {sectorKeywords.map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => searchBySector(keyword)}
                    className="px-3 py-1.5 text-xs border border-lightborder bg-paper text-charcoal/70 hover:border-terracotta hover:text-terracotta transition-colors"
                  >
                    {keyword}
                  </button>
                ))}
                <button
                  onClick={() => { setFilters({ search: '', region: '', sector: '', tier: '', expertiseTags: [] }); fetchParticipants(); }}
                  className="px-3 py-1.5 text-xs border border-sage/30 text-sage hover:bg-sage/10 transition-colors"
                >
                  {language === 'fr' ? 'Réinitialiser' : 'Reset'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Smart Connect - Partner Suggestions Panel */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mb-8 border border-sage/30 bg-sage/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sage" />
                <h3 className="text-sm font-syne text-charcoal uppercase">
                  {language === 'fr' ? 'Connexions suggérées' : 'Suggested Connections'}
                </h3>
              </div>
              <button onClick={() => setShowSuggestions(false)} className="text-charcoal/40 hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {suggestions.map((s) => (
                <div key={s.id} className="flex-shrink-0 w-48 p-4 bg-paper border border-lightborder">
                  <p className="font-medium text-charcoal text-sm truncate">{s.name}</p>
                  <p className="text-xs text-charcoal/50 truncate">{s.organization}</p>
                  <p className="text-xs text-sage mt-1">{s.reason}</p>
                  <p className="text-xs text-charcoal/40 mt-1">{s.country}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid/List */}
        {isLoading ? (
          <div className="text-center py-20 text-charcoal/50">Chargement...</div>
        ) : filteredParticipants.length === 0 ? (
          <Reveal>
            <div className="text-center py-20">
              <div className="w-16 h-16 border-2 border-lightborder mx-auto mb-4 flex items-center justify-center">
                <Users className="w-8 h-8 text-charcoal/30" />
              </div>
              <p className="text-charcoal/50 mb-2">
                {language === 'fr' ? 'Aucun participant dans le catalogue' : 'No participants in the catalog'}
              </p>
              <p className="text-sm text-charcoal/40">
                {language === 'fr' 
                  ? 'Les participants approuvés apparaîtront ici avec leur photo.'
                  : 'Approved participants will appear here with their photo.'
                }
              </p>
            </div>
          </Reveal>
        ) : (
          <div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredParticipants.map((p) => (
              <ParticipantCard 
                key={p.id}
                participant={p}
                language={language}
                filters={filters}
                onBadgeClick={setSelectedParticipant}
                onSmartClick={fetchSuggestionsFor}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>

      {selectedParticipant && (
        <BadgeGenerator participant={selectedParticipant} onClose={() => setSelectedParticipant(null)} />
      )}
    </div>
  );
};
