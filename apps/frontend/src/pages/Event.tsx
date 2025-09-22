import React from 'react';
import { useParams } from 'react-router-dom';
import { Zap, AlertCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import EventDetails from '@/components/events/EventDetails';

const Event = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">Invalid Event ID</h3>
                <p className="text-red-700 dark:text-red-300">No event ID provided in the URL.</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Page Header */}
          <div className="flex flex-col space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 w-fit">
                <Zap className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Event Details</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
                  Detailed information about this smart contract event
                </p>
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <EventDetails id={id} />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Event; 