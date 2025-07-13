import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Layout } from '../ui/Layout';
import { BookOpen, Play, CheckCircle, Lock, ArrowLeft } from 'lucide-react';

interface Module {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  sections: Section[];
}

interface Section {
  id: string;
  name: string;
  type: 'source' | 'test' | 'resource' | 'pyq';
  content: string | null;
  link_url: string | null;
  order_index: number;
  is_required: boolean;
  is_completed?: boolean;
}

interface Subject {
  id: string;
  name: string;
  description: string | null;
}

export function SubjectView() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { profile } = useAuth();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (subjectId) {
      fetchSubjectData();
    }
  }, [subjectId]);

  const fetchSubjectData = async () => {
    try {
      // Fetch subject details
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();

      if (subjectError) throw subjectError;
      setSubject(subjectData);

      // Fetch modules with sections
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          sections(*)
        `)
        .eq('subject_id', subjectId)
        .eq('is_active', true)
        .order('order_index');

      if (modulesError) throw modulesError;

      // Sort sections within each module
      const sortedModules = modulesData?.map(module => ({
        ...module,
        sections: module.sections?.sort((a: Section, b: Section) => a.order_index - b.order_index) || []
      })) || [];

      setModules(sortedModules);

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_section_progress')
        .select('section_id, is_completed')
        .eq('user_id', profile?.id);

      if (progressError) throw progressError;

      const progressMap: Record<string, boolean> = {};
      progressData?.forEach(progress => {
        progressMap[progress.section_id] = progress.is_completed;
      });
      setUserProgress(progressMap);

    } catch (error) {
      console.error('Error fetching subject data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'source': return 'bg-blue-100 text-blue-800';
      case 'test': return 'bg-red-100 text-red-800';
      case 'resource': return 'bg-green-100 text-green-800';
      case 'pyq': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'source': return <BookOpen className="h-4 w-4" />;
      case 'test': return <Play className="h-4 w-4" />;
      case 'resource': return <BookOpen className="h-4 w-4" />;
      case 'pyq': return <Play className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const isModuleUnlocked = (moduleIndex: number) => {
    if (moduleIndex === 0) return true;
    
    const previousModule = modules[moduleIndex - 1];
    if (!previousModule) return true;
    
    return previousModule.sections.every(section => userProgress[section.id]);
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

  if (!subject) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Subject not found</h3>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
            {subject.description && (
              <p className="text-gray-600 mt-1">{subject.description}</p>
            )}
          </div>
        </div>

        {/* Modules */}
        <div className="space-y-6">
          {modules.map((module, moduleIndex) => {
            const isUnlocked = isModuleUnlocked(moduleIndex);
            const completedSections = module.sections.filter(section => userProgress[section.id]).length;
            const totalSections = module.sections.length;
            const progressPercentage = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

            return (
              <div key={module.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {isUnlocked ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <Lock className="h-6 w-6 text-gray-400" />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Module {moduleIndex + 1}: {module.name}
                        </h3>
                        {module.description && (
                          <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {completedSections}/{totalSections} completed
                      </div>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sections */}
                <div className="p-6">
                  <div className="space-y-3">
                    {module.sections.map((section, sectionIndex) => {
                      const isCompleted = userProgress[section.id];
                      const previousSection = sectionIndex > 0 ? module.sections[sectionIndex - 1] : null;
                      const canAccess = isUnlocked && (sectionIndex === 0 || (previousSection && userProgress[previousSection.id]));

                      return (
                        <Link
                          key={section.id}
                          to={canAccess ? `/subjects/${subjectId}/modules/${module.id}/sections/${section.id}` : '#'}
                          className={`
                            block p-4 rounded-lg border transition-all duration-200
                            ${canAccess 
                              ? 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer' 
                              : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                            }
                            ${isCompleted ? 'bg-green-50 border-green-200' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-500">
                                  {sectionIndex + 1}.
                                </span>
                                {getTypeIcon(section.type)}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{section.name}</h4>
                                {section.content && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {section.content.substring(0, 100)}...
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(section.type)}`}>
                                {section.type.toUpperCase()}
                              </span>
                              {isCompleted ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : canAccess ? (
                                <Play className="h-5 w-5 text-blue-500" />
                              ) : (
                                <Lock className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {modules.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">No modules available</h3>
            <p className="mt-2 text-sm text-gray-500">
              This subject doesn't have any modules yet.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}