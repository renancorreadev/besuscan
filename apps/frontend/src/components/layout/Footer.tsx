import React from 'react';
import { ArrowUp, Github, Twitter, Hash, Mail, ExternalLink, Heart, Shield, Zap, Globe, Book, Code, Users, MessageCircle, FileText, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-t border-gray-200/50 dark:border-gray-700/50">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/10 to-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-6 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Brand Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">B</span>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    BesuScan
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Hyperledger Besu Explorer</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                The most trusted and comprehensive block explorer for Hyperledger Besu networks. 
                Explore transactions, blocks, and smart contracts with ease.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Uptime</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">99.9%</p>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Speed</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">&lt;1s</p>
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Follow Us</p>
              <div className="flex items-center space-x-3">
                <a href="#" className="group p-2 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300">
                  <Github className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </a>
                <a href="#" className="group p-2 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300">
                  <Twitter className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </a>
                <a href="#" className="group p-2 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300">
                  <Hash className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </a>
                <a href="#" className="group p-2 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600 transition-all duration-300">
                  <Mail className="h-4 w-4 text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Blockchain Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Blockchain</h3>
            </div>
            <div className="space-y-3">
              <a href="/blocks" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                  <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">■</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">View Blocks</span>
              </a>
              <a href="/transactions" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                  <span className="text-green-600 dark:text-green-400 text-xs font-bold">⟷</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Transactions</span>
              </a>
              <a href="/validators" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <div className="w-8 h-8 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                  <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Validators</span>
              </a>
              <a href="/contracts" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <div className="w-8 h-8 rounded bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50 transition-colors">
                  <Code className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Smart Contracts</span>
              </a>
            </div>
          </div>

          {/* Developers Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm">
                <Code className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Developers</h3>
            </div>
            <div className="space-y-3">
              <a href="/api-docs" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <Book className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">API Documentation</span>
                <ExternalLink className="h-3 w-3 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a href="/besu-docs" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <FileText className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Besu Documentation</span>
                <ExternalLink className="h-3 w-3 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a href="/github" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <Github className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">GitHub Repository</span>
                <ExternalLink className="h-3 w-3 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <a href="/support" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <MessageCircle className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Developer Support</span>
              </a>
            </div>
          </div>

          {/* Company Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 shadow-sm">
                <Globe className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Company</h3>
            </div>
            <div className="space-y-3">
              <a href="/about" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">About Us</span>
              </a>
              <a href="/contact" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Contact</span>
              </a>
              <a href="/terms" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Terms of Service</span>
              </a>
              <a href="/privacy" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Privacy Policy</span>
              </a>
              <a href="/bug-bounty" className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <div className="flex items-center gap-2">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">Bug Bounty</span>
                </div>
              </a>
            </div>

            {/* Back to Top Button */}
            <div className="pt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={scrollToTop}
                className="w-full bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 group text-gray-900 dark:text-white"
              >
                <ArrowUp className="h-4 w-4 mr-2 group-hover:animate-bounce" />
                Back to Top
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-16 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
            
            {/* Copyright */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                © {currentYear} BesuScan. All rights reserved.
              </div>
              <div className="hidden lg:flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
                <span>Powered by</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">H</span>
                  </div>
                  <span className="font-medium">Hyperledger Besu</span>
                </div>
              </div>
            </div>

            {/* Donation Section */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-pink-50 to-red-50 dark:from-pink-900/20 dark:to-red-900/20 rounded-lg border border-pink-200/50 dark:border-pink-700/50">
                <Heart className="h-4 w-4 text-pink-500 animate-pulse" />
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Support us:</span>
                  <button className="ml-2 font-mono text-xs text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 transition-colors">
                    0x27Dg...L5EuLK
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Network Status */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-xs text-gray-500 dark:text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Network Status: Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-blue-500" />
              <span>Latest Block: #15,234,567</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span>Gas Price: 12 Gwei</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
