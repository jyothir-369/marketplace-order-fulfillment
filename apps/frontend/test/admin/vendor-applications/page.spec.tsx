import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

    (api.getPendingVendorApplications as jest.Mock).mockImplementation(async () => { listCalls += 1; return (listCalls === 1 ? [application] : []); });
    (api.approveVendorApplication as jest.Mock).mockResolvedValue({ id: 'a-1', status: 'approved' });

    render(<VendorApplicationsPage />);

    await screen.findByText("v@test.com");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(api.approveVendorApplication).toHaveBeenCalledWith('a-1', { decision: 'approve' });
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

    (api.getPendingVendorApplications as jest.Mock).mockImplementation(async () => { listCalls += 1; return (listCalls === 1 ? [application] : []); });
    (api.approveVendorApplication as jest.Mock).mockImplementation(() => new Promise<void>((r) => { resolveApproval = r as any; }));

    render(<VendorApplicationsPage />);

    await screen.findByText("v@test.com");

    const approve = screen.getByRole("button", { name: "Approve" });
    const reject = screen.getByRole("button", { name: "Reject" });

    fireEvent.click(approve);

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
});
