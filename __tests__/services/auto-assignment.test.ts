import { describe, expect, it } from "vitest";
import { getTargetGroup } from "@/lib/services/auto-assignment.service";

const employee = (position: string, department = "CC") => ({
  id: "employee-1",
  position,
  department: { code: department },
  team: { name: "CC Team B", code: "CC_TEAM_B" },
});

describe("automatic assignment target groups", () => {
  it("recognizes abbreviated Support Head positions", () => {
    expect(getTargetGroup(employee("SUPPORT.H CC"))).toBe("SUPPORT_HEAD_TARGET");
    expect(getTargetGroup(employee("S.H CC"))).toBe("SUPPORT_HEAD_TARGET");
    expect(getTargetGroup(employee("Support Head CC"))).toBe("SUPPORT_HEAD_TARGET");
  });

  it("keeps Head and CR staff groups distinct", () => {
    expect(getTargetGroup(employee("HEAD CC"))).toBe("HEAD_TARGET");
    expect(getTargetGroup(employee("CR", "CR"))).toBe("CR_STAFF");
    expect(getTargetGroup(employee("SUPER.CR", "SUPER"))).toBe("SUPER_TARGET");
  });
});
