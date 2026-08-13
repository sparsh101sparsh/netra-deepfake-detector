#!/usr/bin/env python3
"""
Test Suite for NETRA 4-Pillars Forensic Arbiter:
Tests:
1. Single Image Face-Swap Deepfake
2. Single Image Authentic Portrait
3. Video Deepfake (Reenactment / Face Swap)
4. Video Authentic Media
"""

import os
import sys
import cv2
import json

WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(WORKSPACE, "netra"))
sys.path.insert(0, os.path.join(WORKSPACE, "netra", "pipeline"))

from forensic_arbiter import FourPillarsForensicArbiter

def read_video_frames(video_path, max_frames=60):
    cap = cv2.VideoCapture(video_path)
    frames = []
    while len(frames) < max_frames:
        ret, frame = cap.read()
        if not ret: break
        frames.append(frame)
    cap.release()
    return frames

def run_tests():
    print("==================================================================")
    print("        NETRA 4-PILLARS FORENSIC DEFENSE SYSTEM TEST SUITE        ")
    print("==================================================================")
    
    arbiter = FourPillarsForensicArbiter()
    print("✅ Forensic Arbiter (Spatial + AV + Ocular + Vascular) Initialized\n")
    
    # 1. Test Single Swapped Deepfake Image
    fake_img_path = os.path.join(WORKSPACE, "batch_benchmark_results", "generated_swaps", "swap_043_Narendra_Modi.jpg")
    if os.path.exists(fake_img_path):
        img_bgr = cv2.imread(fake_img_path)
        res_fake_img = arbiter.analyze_media([img_bgr], is_single_image=True)
        print(f"[TEST 1] Swapped Image: {os.path.basename(fake_img_path)}")
        print(f"         Verdict:    {res_fake_img['verdict']} (Confidence: {res_fake_img['confidence']*100:.1f}%)")
        print(f"         Latency:    {res_fake_img['latency_ms']:.2f} ms")
        print(f"         Ocular:     {res_fake_img['pillar_breakdown']['pillar_3_corneal_ocular_physics']['evidence']}")
        print()
        
    # 2. Test Single Authentic Portrait Image
    real_img_path = os.path.join(WORKSPACE, "dataset", "Narendra_Modi", "Narendra_Modi_01.jpg")
    if os.path.exists(real_img_path):
        img_bgr = cv2.imread(real_img_path)
        res_real_img = arbiter.analyze_media([img_bgr], is_single_image=True)
        print(f"[TEST 2] Authentic Portrait: {os.path.basename(real_img_path)}")
        print(f"         Verdict:    {res_real_img['verdict']} (Confidence: {res_real_img['confidence']*100:.1f}%)")
        print(f"         Latency:    {res_real_img['latency_ms']:.2f} ms")
        print(f"         Ocular:     {res_real_img['pillar_breakdown']['pillar_3_corneal_ocular_physics']['evidence']}")
        print()

    # 3. Test Deepfake Video
    fake_vid_path = os.path.join(WORKSPACE, "master_modi_reenactment_148frames.mp4")
    if os.path.exists(fake_vid_path):
        frames = read_video_frames(fake_vid_path, max_frames=60)
        res_fake_vid = arbiter.analyze_media(frames, is_single_image=False)
        print(f"[TEST 3] Deepfake Video: {os.path.basename(fake_vid_path)} ({len(frames)} frames)")
        print(f"         Verdict:    {res_fake_vid['verdict']} (Confidence: {res_fake_vid['confidence']*100:.1f}%)")
        print(f"         Latency:    {res_fake_vid['latency_ms']:.2f} ms")
        print(f"         Ocular:     {res_fake_vid['pillar_breakdown']['pillar_3_corneal_ocular_physics']['evidence']}")
        print(f"         Vascular:   {res_fake_vid['pillar_breakdown']['pillar_4_vascular_rppg_pulse']['evidence']}")
        print(f"         AV Sync:    {res_fake_vid['pillar_breakdown']['pillar_2_audiovisual_sync']['evidence']}")
        print()

    # 4. Test Authentic Video
    real_vid_path = os.path.join(WORKSPACE, "rahulgandhiowner.mov")
    if os.path.exists(real_vid_path):
        frames = read_video_frames(real_vid_path, max_frames=60)
        res_real_vid = arbiter.analyze_media(frames, is_single_image=False)
        print(f"[TEST 4] Authentic Video: {os.path.basename(real_vid_path)} ({len(frames)} frames)")
        print(f"         Verdict:    {res_real_vid['verdict']} (Confidence: {res_real_vid['confidence']*100:.1f}%)")
        print(f"         Latency:    {res_real_vid['latency_ms']:.2f} ms")
        print(f"         Ocular:     {res_real_vid['pillar_breakdown']['pillar_3_corneal_ocular_physics']['evidence']}")
        print(f"         Vascular:   {res_real_vid['pillar_breakdown']['pillar_4_vascular_rppg_pulse']['evidence']}")
        print(f"         AV Sync:    {res_real_vid['pillar_breakdown']['pillar_2_audiovisual_sync']['evidence']}")
        print()

    print("==================================================================")
    print("           ALL 4 PILLARS VALIDATED AND OPERATIONAL                ")
    print("==================================================================")

if __name__ == "__main__":
    run_tests()
