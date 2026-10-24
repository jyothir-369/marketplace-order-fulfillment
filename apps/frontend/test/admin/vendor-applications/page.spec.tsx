import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import VendorApplicationsPage from "../../../app/(operational)/admin/vendor-applications/page";
import * as api from "../../../lib/api";

const application = {
  id: "a-1",
  email: "v@test.com",
  businessName: "Biz",
  reason: "R",
  status: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("Admin vendor-applications", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(api, 'getPendingVendorApplications').mockResolvedValue([]);
    jest.spyOn(api, 'approveVendorApplication').mockResolvedValue({ id: 'a-1', status: 'approved' });
    jest.spyOn(api, 'rejectVendorApplication').mockResolvedValue({ id: 'a-1', status: 'rejected' });
    localStorage.clear();
  });

  it("loads applications, approves one, and refreshes the list", async () => {
    let listCalls = 0;

    (api.getPendingVendorApplications as jest.Mock).mockImplementation(async () => { listCalls += 1; return listCalls === 1 ? [application] : []; });
    (api.approveVendorApplication as jest.Mock).mockResolvedValue({ id: 'a-1', status: 'approved' });

    render(<VendorApplicationsPage />);

    await screen.findByText("v@test.com");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    // Confirm modal appears; enter empty reason; confirm
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Confirm approve" }));

    await waitFor(() => {
      expect(api.approveVendorApplication).toHaveBeenCalledWith('a-1', { decision: 'approve', reason: undefined });
      expect(screen.getByText("No pending applications.")).toBeInTheDocument();
    });

    expect(listCalls).toBe(2);
  });

  it("shows an accessible error on unauthorized load", async () => {
    (api.getPendingVendorApplications as jest.Mock).mockRejectedValue(new Error('Admin only'));

    render(<VendorApplicationsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent('Admin only');
  });

  it("disables action buttons while approval is pending", async () => {
    let listCalls = 0;
    let resolveApproval!: () => void;

    (api.getPendingVendorApplications as jest.Mock).mockImplementation(async () => { listCalls += 1; return listCalls === 1 ? [application] : []; });
    (api.approveVendorApplication as jest.Mock).mockImplementation(() => new Promise<void>((r) => { resolveApproval = r as any; }));

    render(<VendorApplicationsPage />);

    await screen.findByText("v@test.com");

    const approve = screen.getByRole("button", { name: "Approve" });
    const reject = screen.getByRole("button", { name: "Reject" });

    fireEvent.click(approve);

    // The inline modal opens; no request is made until Confirm.
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(api.approveVendorApplication).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm approve" }));

    // While the request is in flight the row action buttons stay disabled.
    await waitFor(() => {
      expect(approve).toBeDisabled();
      expect(reject).toBeDisabled();
    });

    resolveApproval();
    (api.approveVendorApplication as jest.Mock).mockResolvedValue({ id: 'a-1', status: 'approved' });

    await waitFor(() => {
      expect(screen.getByText("No pending applications.")).toBeInTheDocument();
    });
  });

  it("sends entered review reason on approve", async () => {
    (api.getPendingVendorApplications as jest.Mock).mockResolvedValue([application]);
    (api.approveVendorApplication as jest.Mock).mockResolvedValue({ id: 'a-1', status: 'approved' });

    render(<VendorApplicationsPage />);
    await screen.findByText("v@test.com");

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Review reason"), { target: { value: "Good business docs" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm approve" }));

    await waitFor(() => {
      expect(api.approveVendorApplication).toHaveBeenCalledWith('a-1', { decision: 'approve', reason: 'Good business docs' });
    });
  });

  it("sends entered review reason on reject", async () => {
    (api.getPendingVendorApplications as jest.Mock).mockResolvedValue([application]);
    (api.rejectVendorApplication as jest.Mock).mockResolvedValue({ id: 'a-1', status: 'rejected' });

    render(<VendorApplicationsPage />);
    await screen.findByText("v@test.com");

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Review reason"), { target: { value: "Incomplete details" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm reject" }));

    await waitFor(() => {
      expect(api.rejectVendorApplication).toHaveBeenCalledWith('a-1', { decision: 'reject', reason: 'Incomplete details' });
    });
  });

  it("allows empty review reason and submits", async () => {
    (api.getPendingVendorApplications as jest.Mock).mockResolvedValue([application]);
    (api.approveVendorApplication as jest.Mock).mockResolvedValue({ id: 'a-1', status: 'approved' });

    render(<VendorApplicationsPage />);
    await screen.findByText("v@test.com");

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    // Leave reason empty (default); confirm
    fireEvent.click(screen.getByRole("button", { name: "Confirm approve" }));

    await waitFor(() => {
      expect(api.approveVendorApplication).toHaveBeenCalledWith('a-1', { decision: 'approve', reason: undefined });
    });
  });

  it("cancel prevents API call", async () => {
    (api.getPendingVendorApplications as jest.Mock).mockResolvedValue([application]);

    render(<VendorApplicationsPage />);
    await screen.findByText("v@test.com");

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(api.approveVendorApplication).not.toHaveBeenCalled();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("enforces 500 character max on review reason textarea", async () => {
    (api.getPendingVendorApplications as jest.Mock).mockResolvedValue([application]);

    render(<VendorApplicationsPage />);
    await screen.findByText("v@test.com");

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const textarea = screen.getByLabelText("Review reason") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "A".repeat(510) } });
    expect((textarea as HTMLTextAreaElement).value.length).toBeLessThanOrEqual(500);
  });

  it("shows separate approve/reject context in modal labels", async () => {
    (api.getPendingVendorApplications as jest.Mock).mockResolvedValue([application]);

    render(<VendorApplicationsPage />);
    await screen.findByText("v@test.com");

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: /Approve application/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: /Reject application/i })).toBeInTheDocument());
  });
});
