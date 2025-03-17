
import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  onSearch: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value.toLowerCase());
  };

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-xspectrum-purple">Xpectrum AI</h1>
        </div>
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search bots..."
            className="pl-10 w-full bg-xspectrum-lightBlue border-none rounded-full transition-all focus-visible:ring-2 focus-visible:ring-xspectrum-purple focus-visible:ring-opacity-50"
            onChange={handleSearchInputChange}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
