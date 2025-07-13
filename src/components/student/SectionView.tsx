import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Layout } from '../ui/Layout';
import { ArrowLeft, CheckCircle, ExternalLink, FileText, Play } from 'lucide-react';
import toast from 'react-hot-toast';

interface Section {
  id: string;
  name: string;
  type: 'source' | 'test' | 'resource' | 'pyq';
  content: string | null;
  link_url: string | null;
  order_index: number;
  is_required: boolean;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  explanation: string | null;
  order_index: number;
}

export function SectionView() {
  const { subjectId, moduleId, sectionId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (sectionId) {
      fetchSectionData();
    }
  }, [sectionId]);

  const fetchSectionData = async () => {
    try {
      // Fetch section details
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select('*')
        .eq('id', sectionId)
        .single();

      if (sectionError) throw sectionError;
      setSection(sectionData);

      // Fetch questions if it's a test section
      if (sectionData.type === 'test') {
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('section_id', sectionId)
          .order('order_index');

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);
      }

      // Check if section is completed
      const { data: progressData, error: progressError } = await supabase
        .from('user_section_progress')
        .select('is_completed')
        .eq('user_id', profile?.id)
        .eq('section_id', sectionId)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }

      setIsCompleted(progressData?.is_completed || false);

    } catch (error) {
      console.error('Error fetching section data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsCompleted = async () => {
    try {
      const { error } = await supabase
        .from('user_section_progress')
        .upsert({
          user_id: profile?.id,
          section_id: sectionId,
          is_completed: true,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      setIsCompleted(true);
      toast.success('Section marked as completed!');
    } catch (error) {
      console.error('Error marking section as completed:', error);
      toast.error('Failed to mark section as completed');
    }
  };

  const startTest = () => {
    setShowTest(true);
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };

  const handleAnswerSelect = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const submitTest = async () => {
    const correctAnswers = questions.filter((question, index) => 
      answers[index] === question.correct_answer
    ).length;
    
    const finalScore = (correctAnswers / questions.length) * 100;
    setScore(finalScore);
    setShowResults(true);

    // Only mark as completed if score is 100%
    if (finalScore === 100) {
      try {
        const { error } = await supabase
          .from('user_section_progress')
          .upsert({
            user_id: profile?.id,
            section_id: sectionId,
            is_completed: true,
            score: finalScore,
            attempts: 1,
            completed_at: new Date().toISOString()
          });

        if (error) throw error;
        setIsCompleted(true);
        toast.success('Test completed successfully! Section unlocked.');
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    } else {
      toast.error('You need 100% to complete this section. Try again!');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!section) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Section not found</h3>
        </div>
      </Layout>
    );
  }

  if (showTest && section.type === 'test') {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          {!showResults ? (
            <>
              {/* Test Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-gray-900">{section.name}</h1>
                  <span className="text-sm text-gray-500">
                    Question {currentQuestion + 1} of {questions.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Question */}
              {questions[currentQuestion] && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">
                    {questions[currentQuestion].question_text}
                  </h2>
                  
                  <div className="space-y-3">
                    {['A', 'B', 'C', 'D'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleAnswerSelect(currentQuestion, option)}
                        className={`
                          w-full text-left p-4 rounded-lg border transition-all duration-200
                          ${answers[currentQuestion] === option
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <span className="font-medium mr-3">{option}.</span>
                        {option === 'A' ? questions[currentQuestion].option_a :
                         option === 'B' ? questions[currentQuestion].option_b :
                         option === 'C' ? questions[currentQuestion].option_c :
                         questions[currentQuestion].option_d}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-between mt-6">
                    <button
                      onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                      disabled={currentQuestion === 0}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {currentQuestion === questions.length - 1 ? (
                      <button
                        onClick={submitTest}
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
                      >
                        Submit Test
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentQuestion(currentQuestion + 1)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Test Results */
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="text-center">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  score === 100 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <span className={`text-2xl font-bold ${
                    score === 100 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {score.toFixed(0)}%
                  </span>
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {score === 100 ? 'Congratulations!' : 'Keep Trying!'}
                </h2>
                
                <p className="text-gray-600 mb-6">
                  {score === 100 
                    ? 'You scored 100% and completed this section!'
                    : 'You need 100% to complete this section. Review and try again.'
                  }
                </p>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => setShowTest(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Back to Section
                  </button>
                  {score < 100 && (
                    <button
                      onClick={startTest}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            to={`/subjects/${subjectId}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{section.name}</h1>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                section.type === 'source' ? 'bg-blue-100 text-blue-800' :
                section.type === 'test' ? 'bg-red-100 text-red-800' :
                section.type === 'resource' ? 'bg-green-100 text-green-800' :
                'bg-purple-100 text-purple-800'
              }`}>
                {section.type.toUpperCase()}
              </span>
              {isCompleted && (
                <CheckCircle className="h-6 w-6 text-green-500" />
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {section.type === 'test' ? (
            <div className="text-center py-8">
              <Play className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to take the test?</h3>
              <p className="text-gray-600 mb-6">
                You need to score 100% to complete this section and unlock the next one.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Questions: {questions.length}
              </p>
              <button
                onClick={startTest}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium"
              >
                Start Test
              </button>
            </div>
          ) : (
            <>
              {section.content && (
                <div className="prose max-w-none mb-6">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {section.content}
                  </div>
                </div>
              )}

              {section.link_url && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">External Resource</h4>
                  <a
                    href={section.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Open Resource</span>
                  </a>
                </div>
              )}

              {!isCompleted && (
                <div className="border-t border-gray-200 pt-6">
                  <button
                    onClick={markAsCompleted}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium"
                  >
                    Mark as Completed
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
