import React from 'react';
import { Ticket, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

export const ChatTicketCards = ({ tickets, onBook }) => {
  if (!tickets || tickets.length === 0) return null;

  const activeTickets = tickets.filter(t => t.active !== false);

  return (
    <div className="mt-2 space-y-2">
      {activeTickets.map(ticket => (
        <div key={ticket.id} className="bg-white border border-museum-gold/30 rounded-xl p-3 shadow-sm hover:border-museum-gold transition-colors flex flex-col gap-2">
          <div className="flex justify-between items-start gap-2">
            <div>
              <h4 className="text-[13px] font-bold text-museum-brown">{ticket.name}</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{ticket.description || 'Vé tham quan Bảo tàng'}</p>
            </div>
            <div className="text-right whitespace-nowrap">
              <span className="text-xs font-bold text-museum-gold">
                {formatCurrency(ticket.price)}
              </span>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => onBook(ticket)}
              className="inline-flex items-center gap-1 bg-museum-brown hover:bg-museum-brown-dk text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Đặt vé</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
