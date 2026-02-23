export default function ChatLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3 flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
        <div className="space-y-1.5">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden px-4 py-4 space-y-4">
        {/* Message autre */}
        <div className="flex items-end gap-2">
          <div className="h-7 w-7 animate-pulse rounded-full bg-gray-200 flex-shrink-0" />
          <div className="h-10 w-48 animate-pulse rounded-2xl rounded-bl-sm bg-gray-200" />
        </div>
        {/* Message moi */}
        <div className="flex justify-end">
          <div className="h-10 w-56 animate-pulse rounded-2xl rounded-br-sm bg-indigo-200" />
        </div>
        {/* Message autre */}
        <div className="flex items-end gap-2">
          <div className="h-7 w-7 animate-pulse rounded-full bg-gray-200 flex-shrink-0 opacity-0" />
          <div className="h-14 w-64 animate-pulse rounded-2xl rounded-bl-sm bg-gray-200" />
        </div>
        {/* Message moi */}
        <div className="flex justify-end">
          <div className="h-8 w-40 animate-pulse rounded-2xl rounded-br-sm bg-indigo-200" />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-white px-4 py-3 flex gap-2 items-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 h-9 animate-pulse rounded-md bg-gray-200" />
        <div className="h-9 w-9 animate-pulse rounded-md bg-indigo-200 flex-shrink-0" />
      </div>
    </div>
  );
}
