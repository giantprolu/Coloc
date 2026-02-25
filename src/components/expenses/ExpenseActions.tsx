"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteExpense, updateExpense } from "@/app/actions/expenses";
import { splitEqually } from "@/lib/expenses";
import { toast } from "sonner";

interface Member {
  id: string;
  display_name: string;
}

interface EventOption {
  id: string;
  title: string;
}

interface ExpenseSplit {
  member_id: string;
  amount: number;
  member?: { display_name: string };
}

interface ExpenseData {
  id: string;
  title: string;
  amount: number | string;
  paid_by: string | null;
  event_id: string | null;
  splits?: ExpenseSplit[];
}

interface ExpenseActionsProps {
  expense: ExpenseData;
  members: Member[];
  events: EventOption[];
}

export function ExpenseActions({
  expense,
  members,
  events,
}: ExpenseActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit form state
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(String(expense.amount));
  const [paidBy, setPaidBy] = useState(expense.paid_by || "");
  const [eventId, setEventId] = useState(expense.event_id || "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    expense.splits?.map((s) => s.member_id) || []
  );

  const parsedAmount = parseFloat(amount) || 0;
  const perPerson =
    selectedMembers.length > 0
      ? splitEqually(parsedAmount, selectedMembers.length)
      : 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExpense(expense.id);
      toast.success("Dépense supprimée");
      setDeleteOpen(false);
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || parsedAmount <= 0 || selectedMembers.length === 0) return;
    setIsUpdating(true);
    try {
      await updateExpense(expense.id, {
        title,
        amount: parsedAmount,
        paid_by: paidBy,
        event_id: eventId || null,
        splits: selectedMembers.map((memberId) => ({
          member_id: memberId,
          amount: perPerson,
        })),
      });
      toast.success("Dépense modifiée");
      setEditOpen(false);
    } catch {
      toast.error("Erreur lors de la modification");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const resetEditForm = () => {
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setPaidBy(expense.paid_by || "");
    setEventId(expense.event_id || "");
    setSelectedMembers(expense.splits?.map((s) => s.member_id) || []);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              resetEditForm();
              setEditOpen(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Modifier
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette dépense ?</DialogTitle>
            <DialogDescription>
              La dépense &quot;{expense.title}&quot; sera définitivement
              supprimée. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de modification */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la dépense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Description *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Montant (€) *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Payé par *</Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lié à un événement (optionnel)</Label>
              <Select
                value={eventId || "none"}
                onValueChange={(v) => setEventId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucun événement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun événement</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Partager avec</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMember(m.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                      selectedMembers.includes(m.id)
                        ? "bg-indigo-100 border-indigo-300 text-indigo-800"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {m.display_name}
                  </button>
                ))}
              </div>
              {selectedMembers.length > 0 && parsedAmount > 0 && (
                <p className="text-xs text-gray-500">
                  Soit {perPerson.toFixed(2)} € par personne (
                  {selectedMembers.length} participants)
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isUpdating}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={
                  isUpdating ||
                  !title ||
                  parsedAmount <= 0 ||
                  selectedMembers.length === 0
                }
              >
                {isUpdating ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
