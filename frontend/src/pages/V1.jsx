import React, { useState, useEffect, useMemo, useRef } from 'react';

// ---------- Utility helpers ----------
const cls = (...args) => args.filter(Boolean).join(' ');

const normalizeQuestionList = (data) => {
  const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];

  return list
    .filter(Boolean)
    .map((q, index) => ({
      ...q,
      id_name: q.id_name || q.slug || q.key || `question_${q.id || index + 1}`,
      english_text: q.english_text || q.text || q.question || '',
      bangla_text: q.bangla_text || '',
      question_type: q.question_type || q.type || 'rating',
    }));
};

const normalizePhoneNumber = (value) => {
  return String(value || '').replace(/[\s-]/g, '');
};

const isValidPhoneNumber = (value) => {
  const phone = normalizePhoneNumber(value);
  return /^(?:\+8801|8801|01)[3-9]\d{8}$/.test(phone);
};

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
          isSelected ? "scale-110 drop-shadow-lg" : "group-hover:scale-105"
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [questions, setQuestions] = useState([]);
  const [additionalQuestions, setAdditionalQuestions] = useState([]);
  const [doctors, setDoctors] = useState([]);

const [doctorSearchTerm, setDoctorSearchTerm] = useState("");
const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);
const [doctorError, setDoctorError] = useState("");
  const [pageMode, setPageMode] = useState("questions"); // questions | phone | additional | thankYou
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  const [showThankYou, setShowThankYou] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [questionError, setQuestionError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [countdown, setCountdown] = useState(10);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';


  useEffect(() => {
  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${apiUrl}doctors/`);

      if (!response.ok) {
        throw new Error("Failed to fetch doctors");
      }

      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setDoctors(list);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setDoctors([]);
    }
  };

  fetchDoctors();
}, [apiUrl]);
// Add this state in your component
const [selectedDoctorId, setSelectedDoctorId] = useState("");

  const contentRef = useRef(null);
  const emojiContainerRef = useRef(null);
  const doctorDropdownRef = useRef(null);

  const allQuestions = useMemo(() => {
    return [...questions, ...additionalQuestions];
  }, [questions, additionalQuestions]);

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

  const isQuestionAnswered = (question) => {
    if (!question) return false;

    const value = answers[question.id_name];

    if (question.question_type === 'textarea') {
      return typeof value === 'string' && value.trim().length > 0;
    }

    return value !== undefined && value !== null && String(value).trim() !== '';
  };

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const answeredMainQuestions = useMemo(() => {
    return questions.filter((question) => isQuestionAnswered(question)).length;
  }, [questions, answers]);

  const completionPercent = totalQuestions
    ? Math.round((answeredMainQuestions / totalQuestions) * 100)
    : 0;

  const progressWidth = useMemo(() => {
    if (!totalQuestions) return 0;
    if (pageMode === "phone" || pageMode === "additional" || pageMode === "thankYou") return 100;
    return ((currentIndex + 1) / totalQuestions) * 100;
  }, [currentIndex, totalQuestions, pageMode]);

  // Calculate average rating
  const averageRating = useMemo(() => {
    const ratingValues = Object.values(ratings).filter(val => typeof val === 'number');
    if (ratingValues.length === 0) return 0;
    return ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length;
  }, [ratings]);

  const selectedDoctor = useMemo(() => {
  return doctors.find((doctor) => String(doctor.id) === String(selectedDoctorId));
}, [doctors, selectedDoctorId]);

const filteredDoctors = useMemo(() => {
  const search = doctorSearchTerm.trim().toLowerCase();

  if (!search) return doctors;

  return doctors.filter((doctor) => {
    const searchableText = [
      doctor.name,
      doctor.specialization,
      doctor.qualifications,
      doctor.chamber_time,
      doctor.fee,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search);
  });
}, [doctors, doctorSearchTerm]);

useEffect(() => {
  const handleClickOutside = (event) => {
    if (
      doctorDropdownRef.current &&
      !doctorDropdownRef.current.contains(event.target)
    ) {
      setIsDoctorDropdownOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

 const setAnswer = (qid, value, ratingValue, options = {}) => {
  const { autoAdvance = true, isAdditional = false } = options;



  setValidationMessage("");
  setSubmitError("");

  setAnswers(prev => ({ ...prev, [qid]: value }));

  if (ratingValue !== undefined) {
    setRatings(prev => ({ ...prev, [qid]: ratingValue }));
  }

  const question = allQuestions.find(q => q.id_name === qid);

  if (
    question &&
    !isAdditional &&
    autoAdvance &&
    question.question_type !== 'textarea'
  ) {
    setTimeout(() => {
      handleNext(true, qid, value);
    }, 450);
  }
};



  const scrollContentTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

const handleNext = (fromAutoAdvance = false, answeredQid = null, answeredValue = null) => {
  if (pageMode !== "questions") return;

  if (!currentQuestion) return;

  const isAnsweredNow =
    answeredQid === currentQuestion.id_name &&
    answeredValue !== undefined &&
    answeredValue !== null &&
    String(answeredValue).trim() !== '';

  if (!isAnsweredNow && !isQuestionAnswered(currentQuestion)) {
    if (!fromAutoAdvance) {
      setValidationMessage("Please answer this question before continuing. / অনুগ্রহ করে এগিয়ে যাওয়ার আগে উত্তর দিন।");
    }
    return;
  }

  if (currentIndex < totalQuestions - 1) {
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setIsTransitioning(false);
      scrollContentTop();
    }, 300);
  } else {
    setValidationMessage("");
    setPageMode("phone");
    scrollContentTop();
  }
};






// Add this useEffect to fetch doctors
useEffect(() => {
  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${apiUrl}doctors/`);
      const data = await response.json();
      setDoctors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };
  fetchDoctors();
}, [apiUrl]);



// Doctor selection component to add before the phone number section
const renderDoctorSelection = () => (
  <div className="mb-3 md:mb-4" ref={doctorDropdownRef}>
    <label className="block text-gray-700 mb-1 text-sm font-semibold">
      Which doctor did you visit? / কোন ডাক্তার দেখিয়েছেন? *
    </label>

    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsDoctorDropdownOpen((prev) => !prev);
          setDoctorError("");
        }}
        className={cls(
          "w-full p-2 md:p-3 border-2 rounded-lg bg-white text-left flex items-center justify-between gap-2 focus:ring-2 outline-none text-sm transition-all duration-300",
          doctorError
            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
            : "border-gray-200 focus:border-cyan-400 focus:ring-cyan-100"
        )}
      >
        <span className={selectedDoctor ? "text-gray-800 font-medium truncate" : "text-gray-400 truncate"}>
          {selectedDoctor
            ? selectedDoctor.name
            : "Search and select doctor / ডাক্তার নির্বাচন করুন"}
        </span>

        <span className="text-gray-400 text-xs">
          {isDoctorDropdownOpen ? "▲" : "▼"}
        </span>
      </button>

      {isDoctorDropdownOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-cyan-100 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={doctorSearchTerm}
              onChange={(event) => setDoctorSearchTerm(event.target.value)}
              placeholder="Search doctor name, department..."
              className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400"
              autoFocus
            />
          </div>

          <div className="max-h-52 overflow-y-auto">
            {filteredDoctors.length > 0 ? (
              filteredDoctors.map((doctor) => (
                <button
                  key={doctor.id}
                  type="button"
                  onClick={() => {
                    setSelectedDoctorId(String(doctor.id));
                    setDoctorSearchTerm("");
                    setIsDoctorDropdownOpen(false);
                    setDoctorError("");
                  }}
                  className="w-full text-left p-3 hover:bg-cyan-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="font-bold text-gray-800 text-sm leading-tight">
                    {doctor.name}
                  </div>

                  {doctor.specialization && (
                    <div className="text-xs text-cyan-700 mt-0.5">
                      {doctor.specialization}
                    </div>
                  )}

                  {doctor.qualifications && (
                    <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {doctor.qualifications}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-1">
                    {doctor.chamber_time && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {doctor.chamber_time}
                      </span>
                    )}

                    {doctor.fee && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                        {doctor.fee}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-gray-400 text-sm">
                No doctors found
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {selectedDoctor && (
      <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-lg p-2">
        <p className="text-xs text-emerald-700 font-bold">
          ✓ Selected: {selectedDoctor.name}
        </p>

        {selectedDoctor.specialization && (
          <p className="text-[11px] text-emerald-600 mt-0.5">
            {selectedDoctor.specialization}
          </p>
        )}
      </div>
    )}

    {doctorError && (
      <p className="mt-2 text-xs text-red-600 font-medium">
        {doctorError}
      </p>
    )}
  </div>
);

  const handlePrevious = () => {
    setValidationMessage("");

    if (pageMode === "phone") {
      setPageMode("questions");
      scrollContentTop();
      return;
    }

    if (pageMode !== "questions") return;

    if (currentIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setIsTransitioning(false);
        scrollContentTop();
      }, 300);
    }
  };

  useEffect(() => {
    if (showThankYou) {
      setCountdown(10);
    }
  }, [showThankYou]);

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
      setLoadingQuestions(true);
      setQuestionError("");

      try {
        const response = await fetch(`${apiUrl}questions/`);

        if (!response.ok) {
          throw new Error("Failed to load questions.");
        }

        const data = await response.json();
        const normalized = normalizeQuestionList(data);

        const mainQuestions = normalized.filter(q => !q.is_additional);
        const additional = normalized.filter(q => q.is_additional);

        setQuestions(mainQuestions);
        setAdditionalQuestions(additional.length ? additional : []);
      } catch (error) {
        console.error('Error fetching questions:', error);
        setQuestionError("Could not load feedback questions. Please refresh the page and try again.");
      } finally {
        setLoadingQuestions(false);
      }
    };

    fetchQuestions();
  }, [apiUrl]);

  useEffect(() => {
    const handler = (e) => {
      if (pageMode === "questions") {
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'ArrowLeft') handlePrevious();
      }

      if (pageMode === "phone" && e.key === "Enter") {
        handlePhoneSubmit();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // Calculate content height based on available space
  const getContentHeight = () => {
    const headerHeight = windowSize.width < 768 ? 70 : windowSize.width < 1024 ? 90 : 100;
    const progressHeight = 8;
    const navigationHeight = shouldShowNavigation() ? 60 : 0;

    return `calc(100vh - ${headerHeight + progressHeight + navigationHeight}px)`;
  };

  // Calculate content height for Thank You page
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

  const formatAnswers = () => {
    const formatted = {};

    questions.forEach(question => {
      const key = question.id_name;
      const value = answers[key];

      if (value === undefined || value === null || value === '') return;

      if (question.question_type === 'rating') {
        formatted[key] = { rating: ratings[key] };
      } else if (question.question_type === 'textarea') {
        formatted[key] = { text: String(value).trim() };
      } else if (question.question_type === 'yesno') {
        formatted[key] = { yesno: value === 'yes' };
      } else if (question.question_type === 'date') {
        formatted[key] = { date: value };
      } else {
        formatted[key] = { value };
      }
    });

    return formatted;
  };

  const formatAdditionalResponses = () => {
    const responses = {};

    additionalQuestions.forEach(question => {
      const value = answers[question.id_name];

      if (value !== undefined && value !== null && String(value).trim() !== '') {
        responses[question.id_name] = String(value).trim();
      }
    });

    return responses;
  };

  const submitFeedback = async ({ includeAdditionalResponses = false } = {}) => {
    setLoading(true);
    setSubmitError("");

    try {
      const formattedData = {
  doctor_id: selectedDoctorId ? Number(selectedDoctorId) : null,
  phone_number: normalizePhoneNumber(phoneNumber),
  answers: formatAnswers(),
  additional_responses: includeAdditionalResponses ? formatAdditionalResponses() : {}
};

      const response = await fetch(`${apiUrl}feedback/submit_feedback/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData),
      });

      let data = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (response.ok) {
        setPageMode("thankYou");
        setShowThankYou(true);
        return true;
      }

      setSubmitError(
        data?.detail ||
        data?.message ||
        "Failed to submit feedback. Please try again."
      );
      return false;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitError("Network error. Please check your connection and try again.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getFallbackAdditionalQuestions = () => [
    {
      id: 'issue-details',
      id_name: 'issue_details',
      english_text: 'Please tell us more about the issues you faced:',
      bangla_text: 'দয়া করে আমাদের জানান আপনি কী কী সমস্যার সম্মুখীন হয়েছেন:',
      question_type: 'textarea',
      is_additional: true
    },
  ];

  const fetchAdditionalQuestions = async (rating) => {
    try {
      const response = await fetch(`${apiUrl}questions/additional/?rating=${rating}`);

      if (!response.ok) {
        throw new Error("Failed to fetch additional questions.");
      }

      const data = await response.json();
      const normalized = normalizeQuestionList(data);

      const additional = normalized.length
        ? normalized
        : getFallbackAdditionalQuestions();

      setAdditionalQuestions(additional);
      return additional;
    } catch (error) {
      console.error('Error fetching additional questions:', error);
      const fallback = getFallbackAdditionalQuestions();
      setAdditionalQuestions(fallback);
      return fallback;
    }
  };

const handlePhoneSubmit = async () => {
  setDoctorError("");
  setPhoneError("");
  setSubmitError("");

  if (!selectedDoctorId) {
    setDoctorError("Please select which doctor you visited. / অনুগ্রহ করে কোন ডাক্তার দেখিয়েছেন তা নির্বাচন করুন।");
    return;
  }

  if (!phoneNumber.trim()) {
    setPhoneError("Phone number is required. / ফোন নম্বর প্রয়োজন।");
    return;
  }

  if (!isValidPhoneNumber(phoneNumber)) {
    setPhoneError("Please enter a valid Bangladeshi phone number. / সঠিক ফোন নম্বর দিন।");
    return;
  }

  if (averageRating > 0 && averageRating < 3.5) {
    setLoading(true);
    await fetchAdditionalQuestions(averageRating);
    setLoading(false);
    setPageMode("additional");
    scrollContentTop();
    return;
  }

  await submitFeedback({ includeAdditionalResponses: false });
};

  const handleFinishAdditionalFeedback = async () => {
    setSubmitError("");

    const unansweredAdditional = additionalQuestions.find(question => !isQuestionAnswered(question));

    if (unansweredAdditional) {
      setSubmitError("Please complete the additional feedback before finishing. / শেষ করার আগে অতিরিক্ত ফিডব্যাক পূরণ করুন।");
      return;
    }

    await submitFeedback({ includeAdditionalResponses: true });
  };

const renderFaces = (qid, isAdditional = false) => {
  const isVerySmallScreen = windowSize.height < 500;
  const textSize = isVerySmallScreen ? "text-xs" : "text-sm";
  const secondaryTextSize = isVerySmallScreen ? "text-[10px]" : "text-xs";

  const imageSize = isAdditional
    ? "max-w-[34px] sm:max-w-[42px] md:max-w-[50px]"
    : getDynamicImageSize();

  const gridLayout = isAdditional
    ? "grid-cols-5 gap-2 md:gap-3"
    : getGridLayout();

  return (
    <div
      className={cls(
        "w-full flex items-center justify-center p-1 md:p-2",
        isAdditional ? "my-2" : ""
      )}
      ref={emojiContainerRef}
    >
      <div
        className={cls(
          "grid w-full place-items-center",
          isAdditional ? "max-w-2xl" : "max-w-6xl",
          gridLayout
        )}
        style={{
          minHeight: isAdditional
            ? "auto"
            : Math.max(100, windowSize.height * 0.3) + "px"
        }}
      >
        {[
          { key: 'super-happy', src: '/excellent.png', english: 'Excellent', bangla: 'চমৎকার', color: 'text-emerald-600', rating: 5 },
          { key: 'happy', src: '/good.png', english: 'Good', bangla: 'ভাল', color: 'text-cyan-600', rating: 4 },
          { key: 'neutral', src: '/neutral.png', english: 'Neutral', bangla: 'নিরপেক্ষ', color: 'text-gray-600', rating: 3 },
          { key: 'frown', src: '/unsatisfied.png', english: 'Unsatisfied', bangla: 'অসন্তুষ্ট', color: 'text-amber-600', rating: 2 },
          { key: 'angry', src: '/angry.png', english: 'Poor', bangla: 'খারাপ', color: 'text-red-600', rating: 1 },
        ].map(({ key, src, english, bangla, color, rating }) => (
          <div
            key={key}
            className={cls(
              "flex flex-col items-center text-center w-full transition-all duration-300",
              isAdditional
                ? answers[qid] === key
                  ? "rounded-xl border-2 border-cyan-400 bg-cyan-50/80 px-1 py-2 shadow-md"
                  : "rounded-xl border border-gray-100 bg-white px-1 py-2 shadow-sm hover:shadow-md"
                : "p-1"
            )}
          >
            <div className="flex-1 flex items-center justify-center w-full">
              <FeedbackImage
                src={src}
                alt={english}
                isSelected={answers[qid] === key}
                onClick={() => setAnswer(qid, key, rating, { isAdditional })}
                size={`${imageSize} aspect-square`}
              />
            </div>

            <div className="mt-1 md:mt-2">
              <div
                className={cls(
                  textSize,
                  "font-semibold transition-colors duration-300 leading-tight",
                  color
                )}
              >
                {english}
              </div>

              <div
                className={cls(
                  secondaryTextSize,
                  "font-medium transition-colors duration-300 leading-tight",
                  color
                )}
              >
                {bangla}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
const renderTextarea = (qid, isAdditional = false) => (
  <div
    className={cls(
      "w-full flex flex-col items-center justify-center",
      isAdditional ? "m-0 p-0" : "my-4 md:my-8 p-4"
    )}
  >
    <div className="w-full">
      <div className="relative">
        <textarea
          placeholder="Write here... / এখানে লিখুন..."
          value={answers[qid] || ''}
          onChange={(e) =>
            setAnswer(qid, e.target.value, undefined, {
              autoAdvance: false,
              isAdditional,
            })
          }
          className={cls(
            "w-full rounded-xl border-2 border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none text-sm resize-none transition-all duration-300 bg-white/90 backdrop-blur-sm shadow-sm",
            isAdditional ? "h-20 md:h-24 p-2.5" : "h-32 md:h-40 p-4"
          )}
        />

        <div className="absolute bottom-2 right-3 text-[9px] md:text-[10px] text-gray-400">
          {(answers[qid] || '').length} chars
        </div>
      </div>
    </div>
  </div>
);

  const renderYesNo = (qid, isAdditional = false) => (
    <div className="w-full flex items-center justify-center my-4 md:my-8 p-4">
      <div className="flex gap-4 md:gap-6 flex-col sm:flex-row">
        <button
          onClick={() => setAnswer(qid, 'yes', undefined, { isAdditional })}
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
          onClick={() => setAnswer(qid, 'no', undefined, { isAdditional })}
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

const renderDatePicker = (qid, isAdditional = false) => {
  const selectedDate = answers[qid] || '';

  const handleDateChange = (date) => {
    setAnswer(qid, date, undefined, { isAdditional });
  };

  const recentDates = [
    { label: 'Today', bn: 'আজ', value: new Date().toISOString().split('T')[0] },
    { label: 'Yesterday', bn: 'গতকাল', value: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
    { label: 'Last Week', bn: 'গত সপ্তাহ', value: new Date(Date.now() - 604800000).toISOString().split('T')[0] },
  ];

  if (isAdditional) {
    return (
      <div className="w-full flex items-center justify-center p-0 m-0">
        <div className="w-full rounded-xl bg-white/90 border border-cyan-100 p-2 shadow-sm">
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {recentDates.map((dateObj) => (
              <button
                key={dateObj.value}
                onClick={() => handleDateChange(dateObj.value)}
                className={cls(
                  "px-1.5 py-2 rounded-lg text-center transition-all duration-200 border leading-tight",
                  selectedDate === dateObj.value
                    ? "bg-cyan-100 border-cyan-400 text-cyan-800 font-bold"
                    : "bg-gray-50 border-gray-100 text-gray-700 hover:bg-cyan-50"
                )}
              >
                <span className="block text-[10px] md:text-[11px] font-semibold">
                  {dateObj.label}
                </span>
                <span className="block text-[9px] md:text-[10px] text-gray-500">
                  {dateObj.bn}
                </span>
              </button>
            ))}
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full h-9 px-2 rounded-lg border border-gray-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none text-xs text-center transition-all duration-300 bg-white"
            min="2000-01-01"
            max={new Date().toISOString().split('T')[0]}
          />

          {selectedDate && (
            <div className="mt-1.5 text-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-md py-1 px-2 truncate">
              Selected: {new Date(selectedDate).toLocaleDateString('en-BD')}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center my-4 md:my-8 p-4">
      <div className="w-full max-w-md bg-white rounded-xl p-4 md:p-6 shadow-lg">
        <div className="text-center mb-4 md:mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Select Date / তারিখ নির্বাচন করুন
          </h3>
          <p className="text-sm text-gray-600">
            Choose a date from the calendar or quick options
          </p>
        </div>

        <div className="mb-4 md:mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Quick Selection / দ্রুত নির্বাচন
          </h4>

          <div className="grid grid-cols-1 gap-2">
            {recentDates.map((dateObj) => (
              <button
                key={dateObj.value}
                onClick={() => handleDateChange(dateObj.value)}
                className={cls(
                  "p-3 rounded-lg text-left transition-all duration-200 border-2",
                  selectedDate === dateObj.value
                    ? "bg-cyan-100 border-cyan-400"
                    : "bg-gray-100 border-transparent hover:bg-gray-200"
                )}
              >
                <span className="font-medium text-sm md:text-base">
                  {dateObj.label} / {dateObj.bn}
                </span>
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
            max={new Date().toISOString().split('T')[0]}
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
    return renderYesNo(question.id_name, isAdditional);
  } else if (question.question_type === 'date') {
    return renderDatePicker(question.id_name, isAdditional);
  } else {
    return renderFaces(question.id_name, isAdditional);
  }
};

  // Calculate if we need to hide navigation for extremely small screens
  const shouldShowNavigation = () => {
    if (pageMode !== "questions" || showThankYou || questions.length === 0) return false;

    if (windowSize.height < 450) {
      return false;
    }

    return true;
  };

  // Check if screen is extremely small
  const isExtremelySmallScreen = windowSize.height < 450;

  const currentAnswered = isQuestionAnswered(currentQuestion);

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
                  <defs>
                    <linearGradient id="countdownGrad" x1="0" x2="1">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
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

  // Regular feedback form
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
            style={{ width: `${progressWidth}%` }}
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
            {loadingQuestions ? (
              <div className="h-full flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 text-center">
                  <div className="w-10 h-10 rounded-full border-4 border-cyan-100 border-t-cyan-500 animate-spin mx-auto mb-4"></div>
                  <h2 className="text-lg font-bold text-gray-800 mb-1">
                    Loading Questions
                  </h2>
                  <p className="text-sm text-gray-600">
                    অনুগ্রহ করে অপেক্ষা করুন...
                  </p>
                </div>
              </div>
            ) : questionError ? (
              <div className="h-full flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 text-center border border-red-100">
                  <h2 className="text-lg font-bold text-red-600 mb-2">
                    Could not load questions
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    {questionError}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-semibold text-sm hover:from-cyan-700 hover:to-emerald-700 transition-all duration-300"
                  >
                    Refresh / রিফ্রেশ করুন
                  </button>
                </div>
              </div>
            ) : pageMode === "questions" ? (
              <div className="h-full flex flex-col min-h-0">
                {windowSize.height > 400 && (
                  <div className="m-2 md:m-3 lg:m-4 flex-shrink-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-emerald-600">
                        {completionPercent}% Complete
                      </span>

                      {validationMessage && (
                        <span className="hidden sm:block text-xs font-semibold text-amber-600">
                          Answer required
                        </span>
                      )}
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
                        <div className={cls(
                          "bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg md:rounded-xl p-3 md:p-4 lg:p-5 mb-3 md:mb-4 lg:mb-5 transition-all duration-300",
                          validationMessage ? "ring-2 ring-amber-200" : ""
                        )}>
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

                          {validationMessage && (
                            <p className="text-center text-xs md:text-sm text-amber-700 mt-3 font-medium">
                              {validationMessage}
                            </p>
                          )}
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
            ) : pageMode === "phone" ? (
              <div className="h-full flex items-center justify-center p-3 md:p-4">
                <div className="w-full max-w-md bg-white rounded-lg md:rounded-xl shadow-xl p-4 md:p-5 lg:p-6">
                  <h2 className="text-lg md:text-xl font-bold text-center mb-3 text-gray-800">
                    Almost Done! / প্রায় শেষ!
                  </h2>

                  <p className="text-gray-600 text-center mb-3 md:mb-4 text-sm">
  Please select your doctor and provide your phone number / ডাক্তার নির্বাচন করুন এবং ফোন নম্বর প্রদান করুন
</p>

{renderDoctorSelection()}

<div className="mb-3 md:mb-4">
  <label className="block text-gray-700 mb-1 text-sm">
    Phone Number / ফোন নম্বর *
  </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setPhoneError("");
                        setSubmitError("");
                      }}
                      placeholder="Example: 01XXXXXXXXX"
                      className={cls(
                        "w-full p-2 md:p-3 border-2 rounded-lg focus:ring-2 outline-none text-sm transition-all duration-300",
                        phoneError
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                          : "border-gray-200 focus:border-cyan-400 focus:ring-cyan-100"
                      )}
                      required
                    />

                    {phoneError && (
                      <p className="mt-2 text-xs text-red-600 font-medium">
                        {phoneError}
                      </p>
                    )}

                    {submitError && (
                      <p className="mt-2 text-xs text-red-600 font-medium">
                        {submitError}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handlePrevious}
                      disabled={loading}
                      className="w-1/3 py-2 md:py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300 text-sm disabled:opacity-50"
                    >
                      Back
                    </button>

                    <button
                      onClick={handlePhoneSubmit}
disabled={!selectedDoctorId || !phoneNumber.trim() || loading}
                      className={cls(
                        "w-2/3 py-2 md:py-3 bg-gradient-to-r from-cyan-600 to-emerald-600 text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm",
(!selectedDoctorId || !phoneNumber.trim() || loading) ? "opacity-50 cursor-not-allowed" : "hover:from-cyan-700 hover:to-emerald-700"
                      )}
                    >
                      {loading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Processing...
                        </>
                      ) : (
                        "Submit Feedback / ফিডব্যাক জমা দিন"
                      )}
                    </button>
                  </div>
                </div>
              </div>
       ) : pageMode === "additional" ? (
  <div className="h-full flex items-center justify-center p-2 md:p-3 overflow-hidden">
    <div className="w-full max-w-7xl flex flex-col justify-center overflow-hidden">
      {/* Compact Header */}
      <div className="text-center mb-2 flex-shrink-0">
        <h2 className="text-base md:text-lg font-extrabold text-gray-800 leading-tight">
          Additional Feedback
          <span className="text-cyan-600 ml-2">/ অতিরিক্ত ফিডব্যাক</span>
        </h2>

        <p className="text-[10px] md:text-[11px] text-gray-500 mt-0.5">
          Please answer these quick follow-up questions
        </p>
      </div>

      {/* Smaller Centered Question Boxes */}
      <div className="rounded-2xl border border-cyan-100 bg-white/95 shadow-lg shadow-cyan-100/40 overflow-hidden">
        <div
          className={cls(
            "grid gap-2 p-2 md:p-3 items-stretch",
            additionalQuestions.length === 1 && "grid-cols-1",
            additionalQuestions.length === 2 && "grid-cols-2",
            additionalQuestions.length === 3 && "grid-cols-3",
            additionalQuestions.length === 4 && "grid-cols-4",
            additionalQuestions.length >= 5 && "grid-cols-5"
          )}
        >
          {additionalQuestions.map((question, index) => (
            <div
              key={question.id_name}
              className={cls(
                "relative rounded-xl border bg-gradient-to-br from-white via-cyan-50/35 to-emerald-50/35 p-2 shadow-sm flex flex-col overflow-hidden transition-all duration-300",
                "min-h-[185px] max-h-[245px]",
                isQuestionAnswered(question)
                  ? "border-cyan-300 ring-2 ring-cyan-100"
                  : "border-gray-100"
              )}
            >
              {/* Number Badge */}
              <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-cyan-600 to-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
                {index + 1}
              </div>

              {/* Done Badge */}
              {isQuestionAnswered(question) && (
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-bold">
                  Done
                </div>
              )}

              {/* Question Text */}
              <div className="pt-6 flex-shrink-0">
                <h3 className="text-[11px] md:text-xs font-bold text-gray-800 leading-snug line-clamp-2 text-center">
                  {question.english_text}
                </h3>

                {question.bangla_text && (
                  <h3 className="text-[10px] md:text-[11px] font-semibold text-gray-600 leading-snug line-clamp-2 mt-0.5 text-center">
                    {question.bangla_text}
                  </h3>
                )}
              </div>

              {/* Answer Area */}
              <div className="flex-1 min-h-0 flex items-center justify-center mt-1">
                {renderQuestionContent(question, true)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error + Finish Button */}
      <div className="flex-shrink-0 mt-2">
        {submitError && (
          <p className="mb-1.5 text-[10px] md:text-xs text-red-600 font-semibold text-center bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
            {submitError}
          </p>
        )}

        <button
          onClick={handleFinishAdditionalFeedback}
          disabled={loading}
          className={cls(
            "w-full py-2 rounded-xl font-bold text-xs md:text-sm text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-md",
            "bg-gradient-to-r from-cyan-600 via-cyan-500 to-emerald-600",
            loading
              ? "opacity-60 cursor-not-allowed"
              : "hover:from-cyan-700 hover:via-cyan-600 hover:to-emerald-700"
          )}
        >
          {loading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Submitting...
            </>
          ) : (
            "Finish Feedback / শেষ করুন"
          )}
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
                onClick={() => handleNext(false)}
                disabled={!currentAnswered}
                className={cls(
                  "flex-1 min-w-[80px] sm:min-w-[100px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-cyan-600 to-emerald-600 transition-all duration-300 text-xs",
                  currentAnswered
                    ? "hover:from-cyan-700 hover:to-emerald-700"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                {currentIndex === totalQuestions - 1 ? "Continue →" : "Next →"}
              </button>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}