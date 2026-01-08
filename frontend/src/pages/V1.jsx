import React, { useState, useEffect, useMemo, useRef } from 'react';

// ---------- Utility helpers ----------
const cls = (...args) => args.filter(Boolean).join(' ');

// ---------- Image Components ----------
function FeedbackImage({ src, alt, isSelected, onClick, size = "" }) {
  return (
    <div 
      className={cls(
        "flex flex-col items-center transition-all duration-300 cursor-pointer group",
        isSelected ? "scale-110" : "hover:scale-105"
      )}
      onClick={onClick}
    >
      <img 
        src={src} 
        alt={alt}
        className={cls(
          size,
          "object-contain transition-all duration-300",
          isSelected ? "scale-110" : "group-hover:scale-105"
        )}
      />
    </div>
  );
}

// ---------- Progress Ring Component ----------
function ProgressRing({ percent = 0, size = 96 }) {
  const responsiveSize = typeof window !== 'undefined' && window.innerWidth < 768 ? 64 : size;
  
  return (
    <div className="relative">
      <svg viewBox="0 0 36 36" width={responsiveSize} height={responsiveSize} className="transform -rotate-90">
        <defs>
          <linearGradient id="progressGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#2d98b7" />
            <stop offset="50%" stopColor="#62b088" />
            <stop offset="100%" stopColor="#2d98b7" />
          </linearGradient>
        </defs>
        <path 
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
          fill="none" 
          stroke="#e2e8f0" 
          strokeWidth="3" 
        />
        <path 
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
          fill="none" 
          stroke="url(#progressGrad)" 
          strokeWidth="3" 
          strokeDasharray={`${percent} ${100 - percent}`} 
          strokeLinecap="round" 
          className="drop-shadow-sm"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs md:text-sm font-bold text-gray-700">{percent}%</span>
      </div>
    </div>
  );
}

// ---------- Dot Stepper Component ----------
function DotStepper({ total = 5, active = 0 }) {
  return (
    <div className="flex items-center gap-1 md:gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div 
          key={i} 
          className={cls(
            'w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-500',
            i === active 
              ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 scale-150 shadow-lg' 
              : i < active
              ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
              : 'bg-gray-300'
          )} 
        />
      ))}
    </div>
  );
}

// ---------- Main Component ----------
export default function JGHealthcareFeedback() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [ratings, setRatings] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [showAdditionalQuestions, setShowAdditionalQuestions] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [additionalQuestions, setAdditionalQuestions] = useState([]);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  const [showThankYou, setShowThankYou] = useState(false);
  const [loading, setLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';
  const [dateAnswers, setDateAnswers] = useState({});
  const [countdown, setCountdown] = useState(10);

  const contentRef = useRef(null);
  const emojiContainerRef = useRef(null);

  // Calculate safe area dimensions
  const getSafeDimensions = () => {
    const isMobile = windowSize.width < 768;
    const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
    
    return {
      headerHeight: isMobile ? '70px' : isTablet ? '90px' : '100px',
      progressHeight: '8px',
      navigationHeight: isMobile ? '50px' : '60px',
      contentPaddingBottom: isMobile ? '55px' : '65px'
    };
  };

  const safeDimensions = getSafeDimensions();

  const setAnswer = (qid, value, ratingValue) => {
    setAnswers(prev => ({ ...prev, [qid]: value }));
    
    if (ratingValue !== undefined) {
      setRatings(prev => ({ ...prev, [qid]: ratingValue }));
    }
    
    const question = questions.find(q => q.id_name === qid);
    if (question && question.question_type === 'date') {
      setDateAnswers(prev => ({ ...prev, [qid]: value }));
    }
    
    if (question && question.question_type !== 'textarea') {
      setTimeout(handleNext, 600);
    }
  };

  useEffect(() => {
    if (showThankYou) {
      const timer = setTimeout(() => {
        window.location.href = "/";
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showThankYou]);

  useEffect(() => {
    if (showThankYou) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            window.location.href = "/";
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showThankYou]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch questions from API
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`${apiUrl}questions/`);
        const data = await response.json();
        setQuestions(data.filter(q => !q.is_additional));
        setAdditionalQuestions([]);
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };

    fetchQuestions();
  }, [apiUrl]);

  const totalQuestions = questions.length;
  const completionPercent = Math.round((Object.keys(answers).length / totalQuestions) * 100);

  // Calculate average rating
  const averageRating = useMemo(() => {
    const ratingValues = Object.values(ratings).filter(val => typeof val === 'number');
    if (ratingValues.length === 0) return 0;
    return ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length;
  }, [ratings]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrevious();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, answers]);

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsTransitioning(false);
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      }, 300);
    } else {
      setShowPhoneInput(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setIsTransitioning(false);
        if (contentRef.current) {
          contentRef.current.scrollTop = 0;
        }
      }, 300);
    }
  };

  // Calculate content height based on available space
  const getContentHeight = () => {
    const headerHeight = windowSize.width < 768 ? 70 : windowSize.width < 1024 ? 90 : 100;
    const progressHeight = 8;
    const navigationHeight = 60;
    
    return `calc(100vh - ${headerHeight + progressHeight + navigationHeight}px)`;
  };

  // Calculate content height for Thank You page (no navigation)
  const getThankYouContentHeight = () => {
    const headerHeight = windowSize.width < 768 ? 70 : windowSize.width < 1024 ? 90 : 100;
    const progressHeight = 8;
    
    return `calc(100vh - ${headerHeight + progressHeight}px)`;
  };

  // Dynamic image sizing based on available height
  const getDynamicImageSize = () => {
    const isMobile = windowSize.width < 768;
    const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
    const isSmallScreen = windowSize.height < 600;
    const isVerySmallScreen = windowSize.height < 500;
    
    if (isVerySmallScreen) {
      return "max-w-[30px] sm:max-w-[40px]";
    } else if (isSmallScreen) {
      return "max-w-[40px] sm:max-w-[50px]";
    } else if (isMobile) {
      return "max-w-[50px] sm:max-w-[60px]";
    } else if (isTablet) {
      return "max-w-[70px] md:max-w-[80px]";
    } else {
      return "max-w-[90px] lg:max-w-[100px]";
    }
  };

  // Dynamic grid layout for very small screens
  const getGridLayout = () => {
    const isVerySmallScreen = windowSize.height < 500;
    if (isVerySmallScreen) {
      return "grid-cols-5 gap-1";
    }
    return "grid-cols-5 gap-2 md:gap-4";
  };

  const submitFeedback = async () => {
    setLoading(true);
    try {
      const formattedData = {
        phone_number: phoneNumber,
        answers: formatAnswers(answers),
        additional_responses: showAdditionalQuestions ? formatAdditionalResponses() : {}
      };

      const response = await fetch(`${apiUrl}feedback/submit_feedback/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData),
      });

      const data = await response.json();
      if (response.ok) {
        setSubmitted(true);
        if (averageRating < 3.5) {
          await fetchAdditionalQuestions(averageRating);
          setShowAdditionalQuestions(true);
        } else {
          setShowThankYou(true);
        }
      } else {
        alert('Failed to submit feedback. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAnswers = (answers) => {
    const formatted = {};
    Object.keys(answers).forEach(key => {
      const question = questions.find(q => q.id_name === key);
      if (question) {
        if (question.question_type === 'rating') {
          formatted[key] = { rating: ratings[key] };
        } else if (question.question_type === 'textarea') {
          formatted[key] = { text: answers[key] };
        } else if (question.question_type === 'yesno') {
          formatted[key] = { yesno: answers[key] === 'yes' };
        } else if (question.question_type === 'date') {
          formatted[key] = { date: answers[key] };
        }
      }
    });
    return formatted;
  };

  const formatAdditionalResponses = () => {
    const responses = {};
    additionalQuestions.forEach(question => {
      responses[question.id_name] = answers[question.id_name] || '';
    });
    return responses;
  };

  const handlePhoneSubmit = () => {
    if (phoneNumber) {
      submitFeedback();
    }
  };

  const fetchAdditionalQuestions = async (rating) => {
    try {
      const response = await fetch(`${apiUrl}questions/additional/?rating=${rating}`);
      const data = await response.json();
      setAdditionalQuestions(data);
    } catch (error) {
      console.error('Error fetching additional questions:', error);
      setAdditionalQuestions([
        {
          id: 'issue-details',
          english_text: 'Please tell us more about the issues you faced:',
          bangla_text: 'দয়া করে আমাদের জানান আপনি কী কী সমস্যার সম্মুখীন হয়েছেন:',
          question_type: 'textarea'
        },
      ]);
    }
  };

  const renderFaces = (qid) => {
    const isVerySmallScreen = windowSize.height < 500;
    const textSize = isVerySmallScreen ? "text-xs" : "text-sm";
    const secondaryTextSize = isVerySmallScreen ? "text-xxs" : "text-xs";
    const imageSize = getDynamicImageSize();
    const gridLayout = getGridLayout();

    return (
      <div className="w-full flex items-center justify-center p-1 md:p-2" ref={emojiContainerRef}>
        <div
          className={`grid w-full max-w-6xl ${gridLayout} place-items-center`}
          style={{ 
            minHeight: Math.max(100, windowSize.height * 0.3) + 'px'
          }}
        >
          {[
            { key: 'super-happy', src: '/excellent.png', english: 'Excellent', bangla: 'চমৎকার', color: 'text-emerald-600', rating: 5 },
            { key: 'happy', src: '/good.png', english: 'Good', bangla: 'ভাল', color: 'text-cyan-600', rating: 4 },
            { key: 'neutral', src: '/neutral.png', english: 'Neutral', bangla: 'নিরপেক্ষ', color: 'text-gray-600', rating: 3 },
            { key: 'frown', src: '/unsatisfied.png', english: 'Unsatisfied', bangla: 'অসন্তুষ্ট', color: 'text-amber-600', rating: 2 },
            { key: 'angry', src: '/angry.png', english: 'Poor', bangla: 'খারাপ', color: 'text-red-600', rating: 1 },
          ].map(({ key, src, english, bangla, color, rating }) => (
            <div key={key} className="flex flex-col items-center text-center p-1 w-full">
              <div className="flex-1 flex items-center justify-center w-full">
                <FeedbackImage
                  src={src}
                  alt={english}
                  isSelected={answers[qid] === key}
                  onClick={() => setAnswer(qid, key, rating)}
                  size={`${imageSize} aspect-square`}
                />
              </div>
              <div className="mt-1 md:mt-2">
                <div className={cls(textSize, "font-semibold transition-colors duration-300 leading-tight", color)}>
                  {english}
                </div>
                <div className={cls(secondaryTextSize, "font-medium transition-colors duration-300 leading-tight", color)}>
                  {bangla}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTextarea = (qid, hideNextButton = false) => (
    <div className="w-full flex flex-col items-center justify-center my-4 md:my-8 p-4">
      <div className="w-full max-w-2xl">
        <div className="relative">
          <textarea
            placeholder="Write here... / এখানে লিখুন..."
            value={answers[qid] || ''}
            onChange={(e) => setAnswer(qid, e.target.value)}
            className="w-full h-32 md:h-40 p-4 rounded-xl border-2 border-gray-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none text-base resize-none transition-all duration-300 bg-white/80 backdrop-blur-sm shadow-lg"
          />
          <div className="absolute bottom-3 right-3 text-xs text-gray-400">
            {(answers[qid] || '').length} characters / অক্ষর
          </div>
        </div>
      </div>
    </div>
  );

  const renderYesNo = (qid) => (
    <div className="w-full flex items-center justify-center my-4 md:my-8 p-4">
      <div className="flex gap-4 md:gap-6 flex-col sm:flex-row">
        <button
          onClick={() => setAnswer(qid, 'yes')}
          className={cls(
            'px-6 md:px-8 py-2 md:py-3 rounded-2xl font-semibold text-sm md:text-base transition-all duration-300 transform hover:scale-105',
            answers[qid] === 'yes' 
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-200' 
              : 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 hover:from-emerald-200 hover:to-emerald-300 shadow-lg'
          )}
        >
          ✓ Yes / হ্যাঁ
        </button>
        <button
          onClick={() => setAnswer(qid, 'no')}
          className={cls(
            'px-6 md:px-8 py-2 md:py-3 rounded-2xl font-semibold text-sm md:text-base transition-all duration-300 transform hover:scale-105',
            answers[qid] === 'no' 
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl shadow-red-200' 
              : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 hover:from-red-200 hover:to-red-300 shadow-lg'
          )}
        >
          ✗ No / না
        </button>
      </div>
    </div>
  );

  const renderDatePicker = (qid) => {
    const selectedDate = answers[qid] || '';

    const handleDateChange = (date) => {
      setAnswer(qid, date);
    };

    const recentDates = [
      { label: 'Today / আজ', value: new Date().toISOString().split('T')[0] },
      { label: 'Yesterday / গতকাল', value: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
      { label: 'Last Week / গত সপ্তাহ', value: new Date(Date.now() - 604800000).toISOString().split('T')[0] },
    ];

    return (
      <div className="w-full flex items-center justify-center my-4 md:my-8 p-4">
        <div className="w-full max-w-md bg-white rounded-xl p-4 md:p-6 shadow-lg">
          <div className="text-center mb-4 md:mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Select Date / তারিখ নির্বাচন করুন</h3>
            <p className="text-sm text-gray-600">Choose a date from the calendar or quick options</p>
          </div>
          
          <div className="mb-4 md:mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Selection / দ্রুত নির্বাচন</h4>
            <div className="grid grid-cols-1 gap-2">
              {recentDates.map((dateObj, index) => (
                <button
                  key={index}
                  onClick={() => handleDateChange(dateObj.value)}
                  className={`p-3 rounded-lg text-left transition-all duration-200 ${
                    selectedDate === dateObj.value
                      ? 'bg-cyan-100 border-2 border-cyan-400'
                      : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <span className="font-medium text-sm md:text-base">{dateObj.label}</span>
                  <br />
                  <span className="text-xs md:text-sm text-gray-600">
                    {new Date(dateObj.value).toLocaleDateString('en-BD')}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or choose specific date / বা নির্দিষ্ট তারিখ নির্বাচন করুন
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 outline-none text-center text-base md:text-lg transition-all duration-300"
              min="2000-01-01"
              max="2030-12-31"
            />
          </div>
          
          {selectedDate && (
            <div className="mt-4 p-3 bg-gradient-to-r from-cyan-50 to-emerald-50 rounded-lg border border-cyan-200">
              <p className="text-center text-cyan-800 font-medium">
                <span className="block text-sm md:text-base">
                  Selected: {new Date(selectedDate).toLocaleDateString('en-BD', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
                <span className="block text-xs md:text-sm mt-1">
                  নির্বাচিত: {new Date(selectedDate).toLocaleDateString('bn-BD', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuestionContent = (question, isAdditional = false) => {
    if (!question) return null;
    
    if (question.question_type === 'textarea') {
      return renderTextarea(question.id_name, isAdditional);
    } else if (question.question_type === 'yesno') {
      return renderYesNo(question.id_name);
    } else if (question.question_type === 'date') {
      return renderDatePicker(question.id_name);
    } else {
      return renderFaces(question.id_name);
    }
  };

  const currentQuestion = questions[currentIndex];

  // Calculate if we need to hide navigation for extremely small screens
  const shouldShowNavigation = () => {
    if (showPhoneInput || submitted || showThankYou || questions.length === 0) return false;
    
    if (windowSize.height < 450) {
      return false;
    }
    
    return true;
  };

  // Check if screen is extremely small
  const isExtremelySmallScreen = windowSize.height < 450;

  // If showing Thank You page, render it completely separately
  if (showThankYou) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-cyan-50 via-white to-emerald-50 overflow-hidden fixed inset-0">
        <div className="w-full h-full flex flex-col">
          {/* Fixed Header */}
          <header 
            className="relative bg-gradient-to-r from-cyan-600 via-cyan-500 to-emerald-500 text-white px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-5 flex-shrink-0"
            style={{ height: safeDimensions.headerHeight }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-emerald-600/20"></div>
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap h-full">
              <img 
                src="/logo.png" 
                alt="JG Healthcare Logo" 
                className="bg-white w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain rounded-lg"
              />
              <h1 className="text-base sm:text-lg md:text-xl font-extrabold text-center tracking-wide">
                JG HealthCare Ltd
              </h1>
            </div>
          </header>

          {/* Fixed Progress bar - full width */}
          <div 
            className="h-2 bg-gray-100 w-full relative overflow-hidden flex-shrink-0"
            style={{ height: safeDimensions.progressHeight }}
          >
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-700 ease-out relative"
              style={{ width: '100%' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent"></div>
            </div>
          </div>

          {/* Thank You page content - Takes remaining space */}
          <div 
            className="flex-1 flex items-center justify-center overflow-auto"
            style={{ height: getThankYouContentHeight() }}
          >
            <div className="w-full max-w-2xl mx-auto px-4 py-8 text-center">
              <h2 className={cls(
                "font-extrabold text-gray-800 mb-4 leading-tight",
                windowSize.height < 500 ? "text-lg md:text-xl" : "text-xl md:text-2xl lg:text-3xl"
              )}>
                Thank You for Your Feedback! <br /> 
                <span className="text-cyan-600"> আপনার মতামতের জন্য ধন্যবাদ!</span>
              </h2>

              <p className={cls(
                "text-gray-600 mb-6 leading-tight",
                windowSize.height < 500 ? "text-sm" : "text-base md:text-lg"
              )}>
                We appreciate your time and valuable input. <br />
                <span className="text-emerald-600"> আমরা আপনার সময় এবং মূল্যবান মতামতের প্রশংসা করি।</span>
              </p>

              <div className={cls(
                "relative mb-6 mx-auto",
                windowSize.height < 500 ? "w-24 h-24" : "w-32 h-32 md:w-40 md:h-40"
              )}>
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <path
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845
                       a 15.9155 15.9155 0 0 1 0 31.831
                       a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="url(#countdownGrad)"
                    strokeWidth="3"
                    strokeDasharray={`${(countdown / 10) * 100}, 100`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                  />
                  <defs>
                    <linearGradient id="countdownGrad" x1="0" x2="1">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cls(
                    "font-bold text-cyan-700",
                    windowSize.height < 500 ? "text-xl" : "text-2xl md:text-3xl"
                  )}>
                    {countdown}
                  </span>
                </div>
              </div>

              <p className={cls(
                "text-gray-700 leading-tight",
                windowSize.height < 500 ? "text-xs" : "text-sm md:text-base"
              )}>
                Redirecting to homepage in {countdown} seconds... <br />
                <span className="text-gray-600"> {countdown} সেকেন্ড পরে হোমপেজে ফিরে যাব...</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular feedback form (questions, phone input, additional questions)
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-cyan-50 via-white to-emerald-50 overflow-hidden fixed inset-0">  
      <div className="w-full h-full bg-white/90 rounded-none border border-white/50 flex flex-col">
        {/* Fixed Header */}
        <header 
          className="relative bg-gradient-to-r from-cyan-600 via-cyan-500 to-emerald-500 text-white px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-5 flex-shrink-0 z-30"
          style={{ height: safeDimensions.headerHeight }}
        >
          {windowSize.height > 400 && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-4 md:top-4 md:right-6 z-20">
              <div className="px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-lg shadow-lg bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-600 text-white font-bold text-xs sm:text-sm md:text-base tracking-wide text-center">
                Avg: {averageRating.toFixed(1)}/5
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-emerald-600/20"></div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap h-full">
            {windowSize.height > 400 && (
              <img 
                src="/logo.png" 
                alt="JG Healthcare Logo" 
                className="bg-white w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain rounded-lg"
              />
            )}
            <h1 className={cls(
              "font-extrabold text-center tracking-wide",
              windowSize.height < 400 ? "text-sm" : "text-base sm:text-lg md:text-xl"
            )}>
              JG HealthCare Ltd
            </h1>
          </div>
        </header>

        {/* Fixed Progress bar */}
        <div 
          className="h-2 bg-gray-100 w-full relative overflow-hidden flex-shrink-0 z-20"
          style={{ height: safeDimensions.progressHeight }}
        >
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-700 ease-out relative"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent"></div>
          </div>
        </div>

        {/* Main content area */}
        <div 
          className="flex-1 relative z-10 overflow-hidden"
          style={{ 
            height: getContentHeight(),
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Scrollable content area */}
          <div 
            ref={contentRef}
            className="flex-1 overflow-auto relative"
            style={{
              paddingBottom: shouldShowNavigation() ? safeDimensions.contentPaddingBottom : '20px'
            }}
          >
            {!showPhoneInput && !submitted ? (
              <div className="h-full flex flex-col min-h-0">
                {windowSize.height > 400 && (
                  <div className="m-2 md:m-3 lg:m-4 flex-shrink-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-emerald-600">
                        {completionPercent}% Complete
                      </span>
                    </div>
                    <DotStepper total={totalQuestions} active={currentIndex} />
                  </div>
                )}

                <div className="flex-1 min-h-0 px-2 md:px-4 lg:px-6">
                  <div className={cls(
                    "transition-all duration-500 transform pb-2",
                    isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
                  )}>
                    {currentQuestion && (
                      <>
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg md:rounded-xl p-3 md:p-4 lg:p-5 mb-3 md:mb-4 lg:mb-5">
                          <h2 className={cls(
                            "font-semibold text-gray-800 text-center leading-relaxed mb-1",
                            windowSize.height < 500 ? "text-sm md:text-base" : "text-base md:text-xl lg:text-2xl"
                          )}>
                            {currentQuestion.english_text}
                          </h2>
                          <h2 className={cls(
                            "font-semibold text-gray-800 text-center leading-relaxed",
                            windowSize.height < 500 ? "text-sm md:text-base" : "text-base md:text-xl lg:text-2xl"
                          )}>
                            {currentQuestion.bangla_text}
                          </h2>
                        </div>

                        <div className="flex-1">
                          {renderQuestionContent(currentQuestion)}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {isExtremelySmallScreen && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg mx-2 mb-2">
                    <p className="text-xs text-yellow-800 text-center">
                      Screen height is very small. Consider rotating your device or increasing browser height for better experience.
                    </p>
                  </div>
                )}
              </div>
            ) : showPhoneInput ? (
              <div className="h-full flex items-center justify-center p-3 md:p-4">
                <div className="w-full max-w-md bg-white rounded-lg md:rounded-xl shadow-xl p-4 md:p-5 lg:p-6">
                  <h2 className="text-lg md:text-xl font-bold text-center mb-3 text-gray-800">
                    Almost Done! / প্রায় শেষ!
                  </h2>
                  <p className="text-gray-600 text-center mb-3 md:mb-4 text-sm">
                    Please provide your phone number / আপনার ফোন নম্বর প্রদান করুন
                  </p>
                  
                  <div className="mb-3 md:mb-4">
                    <label className="block text-gray-700 mb-1 text-sm">
                      Phone Number / ফোন নম্বর *
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter your phone number"
                      className="w-full p-2 md:p-3 border-2 border-gray-200 rounded-lg focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none text-sm transition-all duration-300"
                      required
                    />
                  </div>
                  
                  <button
                    onClick={handlePhoneSubmit}
                    disabled={!phoneNumber || loading}
                    className={cls(
                      "w-full py-2 md:py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm",
                      (!phoneNumber || loading) ? "opacity-50 cursor-not-allowed" : "hover:from-cyan-700 hover:to-emerald-700"
                    )}
                  >
                    {loading ? (
                      <svg className="w-4 h-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    ) : (
                      "Submit Feedback / ফিডব্যাক জমা দিন"
                    )}
                  </button>
                </div>
              </div>
            ) : showAdditionalQuestions ? (
              <div className="flex items-center justify-center p-3 md:p-4 h-full">
                <div className="w-full max-w-2xl">
                  <h2 className="text-lg md:text-xl font-bold text-center mb-3 md:mb-4 text-gray-800">
                    Additional Feedback / অতিরিক্ত ফিডব্যাক
                  </h2>

                  <div className="rounded-lg shadow-md p-4 space-y-3 md:space-y-4">
                    {additionalQuestions.map((question) => (
                      <div key={question.id_name} className="mb-3 md:mb-4">
                        <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-1 md:mb-2">
                          {question.english_text}
                        </h3>
                        <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-2 md:mb-3">
                          {question.bangla_text}
                        </h3>
                        {renderQuestionContent(question, true)}
                      </div>
                    ))}

                    <button
                      onClick={async () => {
                        if (showAdditionalQuestions) {
                          await submitFeedback();
                        }
                        setShowAdditionalQuestions(false);
                        setShowThankYou(true);
                      }}
                      className="w-full py-2 md:py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-cyan-700 hover:to-emerald-700 transition-all duration-300 text-sm"
                    >
                      Finish / শেষ করুন
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Fixed Navigation */}
          {shouldShowNavigation() && (
            <nav 
              className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 py-2 px-3 flex items-center justify-between gap-2 z-40 shadow-lg"
              style={{ height: safeDimensions.navigationHeight }}
            >
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={cls(
                  "flex-1 min-w-[80px] sm:min-w-[100px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-600 to-emerald-600 transition-all duration-300 text-xs",
                  currentIndex > 0 ? "hover:from-cyan-700 hover:to-emerald-700" : "opacity-50 cursor-not-allowed"
                )}
              >
                ← Previous
              </button>

              <div className="flex-1 min-w-[50px] sm:min-w-[60px] text-center px-2 py-1 bg-white rounded shadow border border-gray-200 text-gray-800 font-semibold text-xs">
                {currentIndex + 1}/{totalQuestions}
              </div>

              <button
                onClick={handleNext}
                disabled={currentIndex === totalQuestions - 1}
                className={cls(
                  "flex-1 min-w-[80px] sm:min-w-[100px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-600 to-emerald-600 transition-all duration-300 text-xs",
                  currentIndex < totalQuestions - 1 ? "hover:from-cyan-700 hover:to-emerald-700" : "opacity-50 cursor-not-allowed"
                )}
              >
                Next →
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}